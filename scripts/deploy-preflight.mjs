#!/usr/bin/env node
// Deployment preflight for apps/server/.deploy/scripts/deploy.sh.
//
//   node scripts/deploy-preflight.mjs env-file <env> <path>
//       Validates a local env file (names and placeholders only).
//   node scripts/deploy-preflight.mjs secret-manager <env> <prefix> <project>
//       Confirms every required secret exists in Google Secret Manager and
//       prints the --set-secrets mapping on stdout.
//
// Diagnostics go to stderr. Values are never read from Secret Manager and
// never printed.
import { spawnSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ENV_VARS, readEnvFile, validateEnv } from "./lib/env-manifest.mjs";
import {
  readProjectConfig,
  DEFAULT_INTEGRATIONS,
} from "./lib/project-config.mjs";
import { isMain } from "./lib/is-main.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Set by deploy.sh itself, never by the operator.
const RESERVED = new Set([
  "NODE_ENV",
  "PORT",
  "ENVIRONMENT",
  "FLOWSTACK_RELEASE",
]);

export function serverVariables(integrations) {
  return ENV_VARS.filter(
    (v) => v.scope === "server" && (!v.feature || integrations[v.feature]),
  );
}

/** Secret Manager IDs allow letters, digits, hyphens and underscores. */
export function secretId(prefix, name) {
  const id = `${prefix}${name}`;
  if (!/^[A-Za-z0-9_-]{1,255}$/.test(id))
    throw new Error(`Invalid secret ID: ${id}`);
  return id;
}

/**
 * Builds the --set-secrets value from the secret IDs that exist. Required
 * variables must all exist; optional ones are mapped only when present.
 */
export function planSecrets(integrations, prefix, existingIds) {
  const existing = new Set(existingIds);
  const missing = [];
  const mappings = [];
  for (const v of serverVariables(integrations)) {
    const id = secretId(prefix, v.name);
    if (existing.has(id)) mappings.push(`${v.name}=${id}:latest`);
    else if (v.required) missing.push(id);
  }
  return { missing, mapping: mappings.join(",") };
}

export function validateEnvFile(values, integrations) {
  const problems = validateEnv(values, {
    scope: "server",
    integrations,
  }).filter((r) => r.status !== "ok");
  const reserved = Object.keys(values).filter(
    (name) => RESERVED.has(name) && name !== "NODE_ENV" && name !== "PORT",
  );
  return [
    ...problems.map((p) => `${p.name} ${p.message}`),
    ...reserved.map(
      (name) =>
        `${name} is set by the deploy script; remove it from the env file`,
    ),
  ];
}

function listSecretIds(project, prefix) {
  const result = spawnSync(
    process.env.GCLOUD_BIN || "gcloud",
    [
      "secrets",
      "list",
      `--project=${project}`,
      `--filter=name~^projects/[^/]+/secrets/${prefix}`,
      "--format=value(name)",
    ],
    { encoding: "utf8", timeout: 60000 },
  );
  if (result.error || result.status !== 0)
    throw new Error(
      "Could not list Secret Manager secrets. The deploy identity needs roles/secretmanager.viewer on the project (names only; it does not need to read values).",
    );
  return result.stdout
    .split("\n")
    .map((line) => line.trim().split("/").pop())
    .filter(Boolean);
}

async function main([mode, env, arg, project]) {
  const config = await readProjectConfig(root);
  const integrations = config?.integrations || DEFAULT_INTEGRATIONS;
  if (mode === "env-file") {
    const values = await readEnvFile(arg);
    if (!values) throw new Error(`Environment file not found: ${arg}`);
    const problems = validateEnvFile(values, integrations);
    if (problems.length) {
      console.error(`Preflight failed for ${env} (${arg}):`);
      for (const p of problems) console.error(`  - ${p}`);
      process.exitCode = 1;
      return;
    }
    console.error(
      `Preflight: ${Object.keys(values).length} variables in env file, required names present.`,
    );
    return;
  }
  if (mode === "secret-manager") {
    if (!project) throw new Error("Missing GCP project ID");
    const { missing, mapping } = planSecrets(
      integrations,
      arg ?? "",
      listSecretIds(project, arg ?? ""),
    );
    if (missing.length) {
      console.error(
        `Preflight failed for ${env}: missing Secret Manager secrets:`,
      );
      for (const id of missing) console.error(`  - ${id}`);
      console.error(
        "Create them (or sync them from Infisical) before deploying. See apps/server/DEPLOYMENT.md.",
      );
      process.exitCode = 1;
      return;
    }
    console.error(
      `Preflight: ${mapping.split(",").length} secrets mapped from Secret Manager.`,
    );
    process.stdout.write(mapping);
    return;
  }
  console.error(
    "Usage: deploy-preflight.mjs env-file <env> <path> | secret-manager <env> <prefix> <project>",
  );
  process.exitCode = 1;
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
