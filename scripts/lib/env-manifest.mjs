// The single list of environment variable names FlowStack understands. Setup,
// doctor, secret validation and deployment preflight all read this list, so a
// new variable only needs to be declared here. Functions in this file report
// variable names and problems; they never return or print values.
import { parseEnv } from "node:util";
import { readFile } from "node:fs/promises";

/**
 * scope: server (API, never exposed to browsers) | web (public, bundled into the
 *        frontend) | build (CI-only, used while building).
 * feature: only required when that integration is enabled.
 * secret: confidential; must come from Infisical or Secret Manager in deployed
 *         environments.
 */
export const ENV_VARS = [
  {
    name: "BETTER_AUTH_SECRET",
    scope: "server",
    required: true,
    secret: true,
    minLength: 32,
  },
  { name: "BETTER_AUTH_URL", scope: "server", required: true, url: true },
  { name: "FRONTEND_URL", scope: "server", required: true, url: true },
  {
    name: "DATABASE_URL",
    scope: "server",
    required: true,
    secret: true,
    url: true,
  },
  { name: "ALLOWED_ORIGINS", scope: "server" },
  { name: "DOMAIN", scope: "server" },
  { name: "LOG_LEVEL", scope: "server" },
  {
    name: "ZEPTOMAIL_API_KEY",
    scope: "server",
    feature: "email",
    required: true,
    secret: true,
  },
  {
    name: "EMAIL_FROM_ADDRESS",
    scope: "server",
    feature: "email",
    required: true,
  },
  { name: "EMAIL_FROM_NAME", scope: "server", feature: "email" },
  {
    name: "GOOGLE_CLIENT_ID",
    scope: "server",
    feature: "google",
    required: true,
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    scope: "server",
    feature: "google",
    required: true,
    secret: true,
  },
  {
    name: "R2_ACCESS_KEY_ID",
    scope: "server",
    feature: "storage",
    required: true,
    secret: true,
  },
  {
    name: "R2_SECRET_ACCESS_KEY",
    scope: "server",
    feature: "storage",
    required: true,
    secret: true,
  },
  {
    name: "R2_ENDPOINT_URL",
    scope: "server",
    feature: "storage",
    required: true,
    url: true,
  },
  {
    name: "R2_BUCKET_NAME",
    scope: "server",
    feature: "storage",
    required: true,
  },
  { name: "R2_PUBLIC_URL", scope: "server", feature: "storage", url: true },
  {
    name: "SENTRY_DSN",
    scope: "server",
    feature: "sentry",
    required: true,
    url: true,
  },
  { name: "SENTRY_ENVIRONMENT", scope: "server", feature: "sentry" },
  { name: "SENTRY_RELEASE", scope: "server", feature: "sentry" },
  { name: "SENTRY_TRACES_SAMPLE_RATE", scope: "server", feature: "sentry" },
  { name: "VITE_API_BASE_URL", scope: "web", required: true, url: true },
  {
    name: "VITE_SENTRY_DSN",
    scope: "web",
    feature: "sentry",
    required: true,
    url: true,
  },
  { name: "VITE_SENTRY_ENVIRONMENT", scope: "web", feature: "sentry" },
  { name: "VITE_INVITE_DIRECT_SIGNUP", scope: "web" },
  { name: "VITE_INVITE_LOCK_EMAIL", scope: "web" },
  { name: "VITE_INVITE_SKIP_ORGANIZATION_ONBOARDING", scope: "web" },
  { name: "VITE_ALLOW_MULTIPLE_ORGANIZATIONS", scope: "web" },
  {
    name: "SENTRY_AUTH_TOKEN",
    scope: "build",
    feature: "sentry",
    secret: true,
  },
  { name: "SENTRY_ORG", scope: "build", feature: "sentry" },
  { name: "SENTRY_PROJECT", scope: "build", feature: "sentry" },
];

// Values copied from .env.example files. They look filled in but must be replaced.
const PLACEHOLDERS = [
  /^your[-_]/i,
  /change[-_]?this/i,
  /^x{4,}$/i,
  /\/\/user:password@/i,
  /your-account-id|your-bucket|your-public-domain/i,
];

// Names that must never carry a VITE_ prefix: Vite inlines VITE_* into browser bundles.
const CONFIDENTIAL_NAME =
  /SECRET|PASSWORD|PRIVATE|TOKEN|DATABASE_URL|API_KEY|ACCESS_KEY|CREDENTIAL/i;

export function isPlaceholder(value) {
  return PLACEHOLDERS.some((pattern) => pattern.test(value));
}

export function varsFor(scope, integrations) {
  return ENV_VARS.filter(
    (v) => v.scope === scope && (!v.feature || integrations[v.feature]),
  );
}

/**
 * Checks names and value shapes. Returns [{ name, status, message }] where
 * status is ok | missing | placeholder | invalid. Values are never included.
 */
export function validateEnv(env, { scope, integrations }) {
  const results = [];
  for (const spec of varsFor(scope, integrations)) {
    const value = env[spec.name];
    if (value === undefined || value === "") {
      if (spec.required)
        results.push({
          name: spec.name,
          status: "missing",
          message: "not set",
        });
      continue;
    }
    if (isPlaceholder(value)) {
      results.push({
        name: spec.name,
        status: "placeholder",
        message: "still has the example placeholder",
      });
      continue;
    }
    if (spec.minLength && value.length < spec.minLength) {
      results.push({
        name: spec.name,
        status: "invalid",
        message: `must be at least ${spec.minLength} characters`,
      });
      continue;
    }
    if (spec.url && !URL.canParse(value)) {
      results.push({
        name: spec.name,
        status: "invalid",
        message: "is not a valid URL",
      });
      continue;
    }
    results.push({ name: spec.name, status: "ok", message: "set" });
  }
  return results;
}

/** Returns VITE_* names that look confidential and would leak into a browser bundle. */
export function exposedConfidentialNames(env) {
  return Object.keys(env).filter(
    (name) => name.startsWith("VITE_") && CONFIDENTIAL_NAME.test(name),
  );
}

export async function readEnvFile(path) {
  try {
    return parseEnv(await readFile(path, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw new Error(`Could not parse ${path}`, { cause: error });
  }
}
