#!/usr/bin/env node
// Post-install onboarding, run by `bun run setup` after dependencies are
// installed (and safe to run on its own). Development environment only.
//
//   1. Secrets     local .env names, or Infisical sign-in and access
//   2. Database    connectivity
//   3. Migrations  applied only with consent (prompt, --migrate or --yes)
//   4. Doctor      full report
//
//   node scripts/onboard.mjs [--migrate] [--yes] [--non-interactive] [--strict]
//
// Every step is idempotent, so rerunning `bun run setup` resumes where a
// previous run stopped. Nothing here creates, changes or prints credentials.
import { spawn, spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readProjectConfig, frontendApp } from "./lib/project-config.mjs";
import { ENV_VARS, readEnvFile, validateEnv } from "./lib/env-manifest.mjs";
import {
  infisicalBinary,
  infisicalVersion,
  resolveInfisicalTarget,
} from "./lib/infisical.mjs";
import { runWithSecrets } from "./secrets.mjs";
import { targetEnvironment } from "./db.mjs";
import { isMain } from "./lib/is-main.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function runNode(args, { capture = false } = {}) {
  const child = spawn(process.execPath, args, {
    cwd: root,
    stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
  });
  let stdout = "";
  child.stdout?.on("data", (d) => (stdout += d));
  return new Promise((done) =>
    child.on("close", (code) => done({ code: code ?? 1, stdout })),
  );
}

/** Runs a project script, through Infisical when the project uses it. */
async function runScript(useInfisical, args, options = {}) {
  if (!useInfisical) return runNode(args, options);
  try {
    const result = await runWithSecrets(
      "development",
      [process.execPath, ...args],
      options,
    );
    return typeof result === "number" ? { code: result, stdout: "" } : result;
  } catch (error) {
    return { code: 1, stdout: "", error: error.message };
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text.trim().split("\n").at(-1));
  } catch {
    return null;
  }
}

export async function onboard({
  args = [],
  env = process.env,
  interactive = Boolean(process.stdin.isTTY) &&
    !args.includes("--non-interactive"),
} = {}) {
  const config = await readProjectConfig(root);
  if (!config?.mode || !config?.frontend)
    throw new Error(
      "This project is not configured yet. Run `bun run setup` first.",
    );
  const target = targetEnvironment(env);
  if (target !== "development")
    throw new Error(
      `Onboarding only touches the development environment (current target: ${target}).`,
    );
  const consent = args.includes("--migrate") || args.includes("--yes");
  const rl = interactive
    ? createInterface({ input: process.stdin, output: process.stdout })
    : null;
  const confirm = async (question, fallback = false) => {
    if (!rl) return false;
    const answer = (
      await rl.question(`${question} ${fallback ? "[Y/n]" : "[y/N]"} `)
    )
      .trim()
      .toLowerCase();
    return answer ? ["y", "yes"].includes(answer) : fallback;
  };
  const steps = [];
  const record = (name, status, detail, next = "") => {
    steps.push({ name, status, detail, next });
    const mark = { done: "✓", action: "!", skipped: "-", failed: "✗" }[status];
    console.log(
      `  ${mark} ${name.padEnd(11)} ${detail}${next ? `\n${"".padEnd(16)}→ ${next}` : ""}`,
    );
  };
  const useInfisical = Boolean(config.integrations.infisical);

  try {
    console.log("\nChecking the development environment\n");

    // 1. Secrets
    let secretsReady = false;
    if (useInfisical) {
      let resolved = null;
      try {
        resolved = resolveInfisicalTarget("development", config, env);
      } catch (error) {
        record(
          "Secrets",
          "action",
          error.message,
          "Rerun `bun run setup --infisical-project-id <id>`.",
        );
      }
      if (resolved && !infisicalVersion(env))
        record(
          "Secrets",
          "action",
          "Infisical CLI not installed",
          "Install it (https://infisical.com/docs/cli/overview), then rerun `bun run setup`.",
        );
      else if (resolved) {
        const probe = () => runScript(true, ["-e", "0"], { capture: true });
        let access = await probe();
        if (
          access.code !== 0 &&
          (await confirm("Sign in to Infisical now (`infisical login`)?", true))
        ) {
          spawnSync(infisicalBinary(env), ["login"], { stdio: "inherit", env });
          access = await probe();
        }
        if (access.code !== 0)
          record(
            "Secrets",
            "action",
            `cannot read Infisical environment "${resolved.environment}"`,
            "Run `infisical login` and confirm you have read access to development, then rerun `bun run setup`.",
          );
        else {
          const check = await runScript(
            true,
            ["scripts/secrets.mjs", "validate", "--scope", "server"],
            { capture: true },
          );
          const missing = [...check.stdout.matchAll(/!!\s+(\S+)\s+(.+)/g)].map(
            (m) => `${m[1]} (${m[2].trim()})`,
          );
          if (missing.length)
            record(
              "Secrets",
              "action",
              `Infisical: ${missing.join(", ")}`,
              `Add these names to the "${resolved.environment}" environment in Infisical.`,
            );
          else {
            secretsReady = true;
            record(
              "Secrets",
              "done",
              `Infisical "${resolved.environment}": required names present`,
            );
          }
        }
      }
    } else {
      const file = join(root, "apps/server/.env");
      const values = await readEnvFile(file);
      const known = new Set(ENV_VARS.map((v) => v.name));
      const merged = {
        ...(values || {}),
        ...Object.fromEntries(
          Object.entries(env).filter(([k]) => known.has(k)),
        ),
      };
      const issues = validateEnv(merged, {
        scope: "server",
        integrations: config.integrations,
      }).filter((r) => r.status !== "ok");
      if (!values && !merged.DATABASE_URL)
        record(
          "Secrets",
          "action",
          "apps/server/.env is missing",
          "Rerun `bun run setup` to create it from the example, then fill it in.",
        );
      else if (issues.length)
        record(
          "Secrets",
          "action",
          `apps/server/.env: ${issues.map((i) => `${i.name} ${i.message}`).join("; ")}`,
          "Edit apps/server/.env, then rerun `bun run setup`.",
        );
      else {
        secretsReady = true;
        record("Secrets", "done", "apps/server/.env: required names set");
      }
    }

    // 2. Database and 3. migrations
    let databaseReady = false;
    let status = null;
    const readStatus = async () =>
      parseJson(
        (
          await runScript(
            useInfisical,
            ["scripts/db.mjs", "status", "--json"],
            { capture: true },
          )
        ).stdout,
      );
    if (!secretsReady) {
      record("Database", "skipped", "waiting for secrets");
      record("Migrations", "skipped", "waiting for secrets");
    } else {
      status = await readStatus();
      if (!status?.connected) {
        record(
          "Database",
          "failed",
          status?.error || "could not run the database check",
          "Fix DATABASE_URL or start PostgreSQL, then rerun `bun run setup`.",
        );
        record("Migrations", "skipped", "database unavailable");
      } else {
        databaseReady = true;
        record("Database", "done", `connected (${status.host})`);
        if (status.skippedByDrizzle.length)
          record(
            "Migrations",
            "failed",
            `${status.skippedByDrizzle.join(", ")} would be skipped by drizzle`,
            "See docs/getting-started/database.md#out-of-order-migrations.",
          );
        else if (!status.pending.length)
          record(
            "Migrations",
            "done",
            `up to date (${status.applied} applied)`,
          );
        else {
          const approved =
            consent ||
            (await confirm(
              `Apply ${status.pending.length} pending migration(s) to the development database at ${status.host}?`,
            ));
          if (!approved)
            record(
              "Migrations",
              "action",
              `${status.pending.length} pending`,
              `Run \`bun run db:migrate${useInfisical ? ":secrets" : ""}\` (or rerun setup with --migrate).`,
            );
          else {
            const result = await runScript(useInfisical, [
              "scripts/db.mjs",
              "migrate",
            ]);
            status = await readStatus();
            if (
              result.code === 0 &&
              status?.connected &&
              !status.pending.length
            )
              record(
                "Migrations",
                "done",
                `applied; up to date (${status.applied} applied)`,
              );
            else
              record(
                "Migrations",
                "failed",
                "migration did not complete",
                "Run `bun run db:status` for details.",
              );
          }
        }
      }
    }

    // 4. Doctor
    console.log("");
    const doctor = await runScript(useInfisical && secretsReady, [
      "scripts/doctor.mjs",
    ]);
    record(
      "Doctor",
      doctor.code === 0 ? "done" : "action",
      doctor.code === 0
        ? "all checks passed"
        : "some checks need attention (see report above)",
    );

    const remaining = steps.filter(
      (s) => s.status !== "done" && s.status !== "skipped",
    );
    const port = config.ports?.web || 3000;
    if (!remaining.length && databaseReady)
      console.log(
        `\nReady. Start developing:\n\n  bun run dev    then open http://localhost:${port}\n  bun run db:seed    optional development user\n`,
      );
    else
      console.log(
        `\n${remaining.length} item(s) need attention (listed with → above). Setup is resumable: fix them and rerun \`bun run setup\`.\nTo start once ready: bun run dev (apps/${frontendApp(config.frontend)} on port ${port}).\n`,
      );
    return { steps, ready: !remaining.length && databaseReady };
  } finally {
    rl?.close();
  }
}

if (isMain(import.meta.url)) {
  const args = process.argv.slice(2);
  onboard({ args })
    .then(({ ready }) => {
      if (args.includes("--strict") && !ready) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
