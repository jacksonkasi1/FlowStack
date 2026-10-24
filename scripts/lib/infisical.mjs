// Helpers for running commands with secrets injected by the Infisical CLI.
// Secrets only ever live in the child process environment; nothing is written
// to disk and there is no fallback to another environment when access fails.
import { spawnSync } from "node:child_process";
import {
  APP_ENVIRONMENTS,
  DEFAULT_INFISICAL_ENVIRONMENTS,
} from "./project-config.mjs";

// Environment variables set by AI coding agents. Their shells must never receive
// sandbox, beta or production secrets. FLOWSTACK_AI_AGENT lets other tools opt in.
const AGENT_MARKERS = [
  "FLOWSTACK_AI_AGENT",
  "CLAUDECODE",
  "CLAUDE_CODE_ENTRYPOINT",
  "CURSOR_AGENT",
  "CODEX_SANDBOX",
  "CODEX_SANDBOX_NETWORK_DISABLED",
  "GEMINI_CLI",
  "AIDER_MODEL",
  "OPENCODE",
  "CLINE_ACTIVE",
];

export function detectAgent(env = process.env) {
  return AGENT_MARKERS.find((name) => env[name]) || null;
}

export function infisicalBinary(env = process.env) {
  return env.INFISICAL_BIN || "infisical";
}

/** Returns the CLI version string, or null when the CLI is not installed. */
export function infisicalVersion(env = process.env, timeout = 5000) {
  const result = spawnSync(infisicalBinary(env), ["--version"], {
    encoding: "utf8",
    timeout,
    env,
  });
  if (result.error || result.status !== 0) return null;
  return (
    result.stdout.trim().replace(/^infisical version\s*/i, "") || "unknown"
  );
}

/**
 * Resolves the project, Infisical environment slug and secret path for an
 * application environment. Throws with a specific fix when anything is missing.
 */
export function resolveInfisicalTarget(appEnv, config, env = process.env) {
  if (!APP_ENVIRONMENTS.includes(appEnv))
    throw new Error(
      `Unknown environment "${appEnv}". Use one of: ${APP_ENVIRONMENTS.join(", ")}`,
    );
  const projectId = env.INFISICAL_PROJECT_ID || config?.infisical?.projectId;
  if (!projectId)
    throw new Error(
      "No Infisical project configured. Run `bun run setup` and enable Infisical, or set INFISICAL_PROJECT_ID.",
    );
  const slug = (config?.infisical?.environments ||
    DEFAULT_INFISICAL_ENVIRONMENTS)[appEnv];
  if (!slug)
    throw new Error(
      `No Infisical environment mapped for "${appEnv}" in .flowstack.json (infisical.environments).`,
    );
  const secretPath =
    env.INFISICAL_SECRET_PATH || config?.infisical?.secretPath || "/";
  if (!secretPath.startsWith("/"))
    throw new Error("Infisical secret path must start with /");
  return { projectId, environment: slug, secretPath };
}

/**
 * Enforces where each environment's secrets may be used. Development secrets
 * are fine locally. Anything else needs CI (or an explicit operator override)
 * and is always refused inside an AI coding agent.
 */
export function assertEnvironmentAllowed(appEnv, env = process.env) {
  if (appEnv === "development") return;
  const agent = detectAgent(env);
  if (agent)
    throw new Error(
      `Refusing to inject ${appEnv} secrets: an AI coding agent was detected (${agent}). Only development secrets may be used in agent sessions.`,
    );
  if (env.CI === "true" || env.FLOWSTACK_ALLOW_REMOTE_SECRETS === appEnv)
    return;
  throw new Error(
    `Refusing to inject ${appEnv} secrets outside CI. Run this from the deployment workflow, or set FLOWSTACK_ALLOW_REMOTE_SECRETS=${appEnv} for a deliberate operator session.`,
  );
}

export function infisicalRunArgs(target, command) {
  return [
    "run",
    "--silent",
    "--telemetry=false",
    `--projectId=${target.projectId}`,
    `--env=${target.environment}`,
    `--path=${target.secretPath}`,
    "--",
    ...command,
  ];
}
