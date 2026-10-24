#!/usr/bin/env node
// Database workflow commands.
//
//   bun run db:status            Show applied and pending migrations
//   bun run db:migrate           Apply pending migrations (development)
//   bun run db:migrate:secrets   Same, with Infisical development credentials
//   bun run db:seed              Development-only demo user (and organization)
//
// DATABASE_URL comes from the process environment (Infisical), then
// packages/db/.env, then apps/server/.env. Production migrations only run in
// CI with --allow-production; schema resets are never offered here.
import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnvFile } from "./lib/env-manifest.mjs";
import { readProjectConfig } from "./lib/project-config.mjs";
import {
  connect,
  describeDbError,
  migrationStatus,
  parseDatabaseUrl,
} from "./lib/db.mjs";
import { isMain } from "./lib/is-main.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function resolveDatabaseUrl(env = process.env, base = root) {
  if (env.DATABASE_URL) return { url: env.DATABASE_URL, source: "environment" };
  for (const file of ["packages/db/.env", "apps/server/.env"]) {
    const values = await readEnvFile(join(base, file));
    if (values?.DATABASE_URL) return { url: values.DATABASE_URL, source: file };
  }
  return { url: null, source: null };
}

/** Which application environment a command targets. Unset means development. */
export function targetEnvironment(env = process.env) {
  return (
    env.FLOWSTACK_ENV ||
    (env.NODE_ENV === "production" ? "production" : "development")
  );
}

export function assertMigrationAllowed(env, args) {
  const target = targetEnvironment(env);
  if (target === "development") return target;
  if (
    target === "production" &&
    !(env.CI === "true" && args.includes("--allow-production"))
  )
    throw new Error(
      "Refusing to migrate production outside CI. Production migrations run from the deployment workflow with --allow-production.",
    );
  if (target !== "production" && !args.includes(`--confirm-env=${target}`))
    throw new Error(`Migrating ${target} requires --confirm-env=${target}.`);
  return target;
}

export function assertSeedAllowed(env) {
  const target = targetEnvironment(env);
  if (target !== "development")
    throw new Error(
      `Seed data is development-only; current target is ${target}.`,
    );
}

async function withDatabase(fn) {
  const { url, source } = await resolveDatabaseUrl();
  const parsed = parseDatabaseUrl(url);
  if (!parsed.ok)
    throw new Error(
      `${parsed.message}. Set it in packages/db/.env, apps/server/.env, or Infisical.`,
    );
  const sql = connect(url);
  try {
    await sql`select 1`;
  } catch (error) {
    await sql.end({ timeout: 1 });
    throw new Error(`${describeDbError(error)} (DATABASE_URL from ${source})`, {
      cause: error,
    });
  }
  try {
    return await fn(sql, { source, ...parsed });
  } finally {
    await sql.end({ timeout: 1 });
  }
}

function printStatus(status) {
  for (const m of status.applied) console.log(`  applied  ${m.tag}`);
  for (const m of status.pending) console.log(`  PENDING  ${m.tag}`);
  if (status.unknown)
    console.log(
      `  ${status.unknown} applied migration(s) are not in this checkout (database is ahead of the code).`,
    );
  if (status.skippedByDrizzle.length)
    console.log(
      `\n  WARNING: ${status.skippedByDrizzle.map((m) => m.tag).join(", ")} ${status.skippedByDrizzle.length === 1 ? "has" : "have"} an older journal timestamp than the newest applied migration. drizzle-kit migrate will skip ${status.skippedByDrizzle.length === 1 ? "it" : "them"}. See docs/getting-started/database.md#out-of-order-migrations.`,
    );
}

async function status(args) {
  return withDatabase(async (sql, info) => {
    const result = await migrationStatus(sql, root);
    console.log(`Database: connected (${info.host}, from ${info.source})`);
    printStatus(result);
    console.log(
      result.pending.length
        ? `\n${result.pending.length} pending migration(s). Run \`bun run db:migrate\`.`
        : "\nUp to date.",
    );
    if (args.includes("--check") && result.pending.length) process.exitCode = 1;
  });
}

async function migrate(args) {
  const target = assertMigrationAllowed(process.env, args);
  const { url } = await resolveDatabaseUrl();
  // Confirms the connection first so failures get a clear explanation.
  const before = await withDatabase((sql) => migrationStatus(sql, root));
  if (!before.pending.length) {
    console.log(`No pending migrations (${target}).`);
    return;
  }
  if (before.skippedByDrizzle.length) {
    printStatus(before);
    throw new Error(
      "Not migrating: drizzle would skip some pending migrations. Resolve the warning above first.",
    );
  }
  console.log(`Applying ${before.pending.length} migration(s) to ${target}…`);
  const result = spawnSync(
    "bun",
    ["run", "--cwd", "packages/db", "db:migrate"],
    {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, DATABASE_URL: url },
    },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "drizzle-kit migrate failed. The database may be partially migrated; run `bun run db:status`.",
    );
  const after = await withDatabase((sql) => migrationStatus(sql, root));
  if (after.pending.length) {
    printStatus(after);
    throw new Error(
      "Migration command finished but migrations are still pending.",
    );
  }
  console.log("Migrations applied. Database is up to date.");
}

async function seed() {
  assertSeedAllowed(process.env);
  const config = await readProjectConfig(root);
  const { hashPassword } = await import("better-auth/crypto");
  const email = process.env.SEED_USER_EMAIL || "dev@example.com";
  const generated = !process.env.SEED_USER_PASSWORD;
  const password =
    process.env.SEED_USER_PASSWORD || randomBytes(12).toString("base64url");
  await withDatabase(async (sql) => {
    const status = await migrationStatus(sql, root);
    if (status.pending.length)
      throw new Error("Run `bun run db:migrate` before seeding.");
    const [existing] = await sql`select id from "user" where email = ${email}`;
    if (existing) {
      console.log(`Seed user ${email} already exists; nothing changed.`);
      return;
    }
    const userId = randomUUID();
    const hash = await hashPassword(password);
    await sql.begin(async (tx) => {
      await tx`insert into "user" (id, name, email, email_verified, should_onboard)
        values (${userId}, 'Dev User', ${email}, true, false)`;
      await tx`insert into account (id, account_id, provider_id, user_id, password)
        values (${randomUUID()}, ${userId}, 'credential', ${userId}, ${hash})`;
      if ((config?.mode || "organization") === "organization") {
        const orgId = randomUUID();
        await tx`insert into organization (id, name, slug) values (${orgId}, 'Dev Organization', ${`dev-organization-${orgId.slice(0, 4)}`})`;
        await tx`insert into member (id, organization_id, user_id, role) values (${randomUUID()}, ${orgId}, ${userId}, 'owner')`;
      }
    });
    console.log(`Created development user ${email}.`);
    if (generated)
      console.log(
        `Generated development password (shown once, development only): ${password}`,
      );
  });
}

async function main([command, ...args]) {
  if (command === "status") return status(args);
  if (command === "migrate") return migrate(args);
  if (command === "seed") return seed();
  console.log(
    "Usage: node scripts/db.mjs status [--check] | migrate [--confirm-env=<env>|--allow-production] | seed",
  );
  process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
