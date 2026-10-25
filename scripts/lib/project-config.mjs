// Reads and writes .flowstack.json. The file records how a project was generated
// so later upgrades can be traced. It must never contain secrets or access tokens.
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const TEMPLATE_NAME = "FlowStack";
export const TEMPLATE_VERSION = "2.0.0";
export const CONFIG_SCHEMA_VERSION = 2;
export const CONFIG_FILE = ".flowstack.json";

export const INTEGRATIONS = [
  "email",
  "storage",
  "google",
  "sentry",
  "infisical",
];
export const DEFAULT_INTEGRATIONS = {
  email: true,
  storage: true,
  google: false,
  sentry: false,
  infisical: false,
};
// Projects generated before schema 2 always showed Google sign-in and required
// R2 and email, so normalising them keeps their behaviour unchanged.
const LEGACY_INTEGRATIONS = {
  email: true,
  storage: true,
  google: true,
  sentry: false,
  infisical: false,
};
export const DEFAULT_PORTS = { api: 8080, web: 3000 };
// Application environment -> Infisical environment slug.
export const DEFAULT_INFISICAL_ENVIRONMENTS = {
  development: "dev",
  sandbox: "sandbox",
  beta: "beta",
  production: "prod",
};
export const APP_ENVIRONMENTS = Object.keys(DEFAULT_INFISICAL_ENVIRONMENTS);

const PROJECT_NAME = /^[a-z][a-z0-9-]{1,48}[a-z0-9]$/;

/** Returns an error message, or null when the name is usable as a package and service name. */
export function validateProjectName(name) {
  if (typeof name !== "string" || !name) return "Project name is required";
  if (!PROJECT_NAME.test(name))
    return "Use 3-50 lowercase letters, digits or hyphens, starting with a letter and not ending with a hyphen";
  if (name.includes("--"))
    return "Project name cannot contain consecutive hyphens";
  return null;
}

/** Turns a directory name into a valid project name suggestion. */
export function suggestProjectName(value) {
  const name = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^[^a-z]+/, "")
    .replace(/-+$/, "")
    .slice(0, 50)
    .replace(/-+$/, "");
  return validateProjectName(name) ? "flowstack-app" : name;
}

export function displayName(projectName) {
  return projectName
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/**
 * Normalises any historical .flowstack.json shape to schema 2. Unknown keys
 * are preserved so local customisation survives repeated setup.
 */
export function normalizeProjectConfig(raw) {
  if (!raw || typeof raw !== "object") return null;
  const legacy = raw.version !== CONFIG_SCHEMA_VERSION;
  const config = {
    ...raw,
    version: CONFIG_SCHEMA_VERSION,
    template: raw.template || TEMPLATE_NAME,
    templateVersion: raw.templateVersion || (legacy ? "1.x" : TEMPLATE_VERSION),
    sourceCommit: raw.sourceCommit || "unknown",
    projectName: raw.projectName ?? null,
    mode: raw.mode ?? null,
    frontend: raw.frontend ?? null,
    backend: raw.backend || "node",
    integrations: {
      ...(legacy ? LEGACY_INTEGRATIONS : DEFAULT_INTEGRATIONS),
      ...(raw.integrations || {}),
    },
    ports: { ...DEFAULT_PORTS, ...(raw.ports || {}) },
    infisical: {
      projectId: null,
      secretPath: "/",
      ...(raw.infisical || {}),
      environments: {
        ...DEFAULT_INFISICAL_ENVIRONMENTS,
        ...(raw.infisical?.environments || {}),
      },
    },
  };
  for (const key of Object.keys(config.integrations))
    if (!INTEGRATIONS.includes(key)) delete config.integrations[key];
  return config;
}

export async function readProjectConfig(root) {
  let text;
  try {
    text = await readFile(join(root, CONFIG_FILE), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
  try {
    return normalizeProjectConfig(JSON.parse(text));
  } catch {
    throw new Error(
      `${CONFIG_FILE} is not valid JSON. Fix or delete it, then rerun setup.`,
    );
  }
}

export async function writeProjectConfig(root, config) {
  const ordered = {
    version: CONFIG_SCHEMA_VERSION,
    template: TEMPLATE_NAME,
    templateVersion: config.templateVersion,
    sourceCommit: config.sourceCommit,
    projectName: config.projectName,
    mode: config.mode,
    frontend: config.frontend,
    backend: config.backend || "node",
    integrations: config.integrations,
    ports: config.ports,
    infisical: config.infisical,
  };
  for (const [key, value] of Object.entries(config))
    if (!(key in ordered)) ordered[key] = value;
  await writeFile(
    join(root, CONFIG_FILE),
    JSON.stringify(ordered, null, 2) + "\n",
  );
}

export function frontendApp(frontend) {
  return frontend === "tanstack" ? "tanstack" : "web";
}
