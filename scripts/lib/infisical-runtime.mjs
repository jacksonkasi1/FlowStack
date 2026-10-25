// Cloud Run startup authentication. No credentials or secret values are written
// to disk or included in deployment arguments. Fetch before importing the API.
import { ENV_VARS, validateEnv } from "./env-manifest.mjs";

export function runtimeTarget(env) {
  for (const name of [
    "INFISICAL_PROJECT_ID",
    "INFISICAL_RUNTIME_IDENTITY_ID",
    "INFISICAL_RUNTIME_ENVIRONMENT",
  ])
    if (!env[name]) throw new Error(`Missing runtime configuration: ${name}`);
  const domain = new URL(env.INFISICAL_DOMAIN || "https://app.infisical.com");
  if (
    domain.protocol !== "https:" ||
    domain.username ||
    domain.password ||
    domain.search ||
    domain.hash ||
    domain.pathname !== "/"
  )
    throw new Error("INFISICAL_DOMAIN must be an HTTPS origin");
  const secretPath = env.INFISICAL_SECRET_PATH || "/";
  if (!secretPath.startsWith("/"))
    throw new Error("INFISICAL_SECRET_PATH must start with /");
  return {
    domain: domain.origin,
    projectId: env.INFISICAL_PROJECT_ID,
    identityId: env.INFISICAL_RUNTIME_IDENTITY_ID,
    environment: env.INFISICAL_RUNTIME_ENVIRONMENT,
    secretPath,
  };
}

async function request(fetcher, label, url, options = {}, json = true) {
  try {
    const response = await fetcher(url, {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error();
    return await (json ? response.json() : response.text());
  } catch {
    // Never echo remote response bodies, URLs, tokens or fetch error details.
    throw new Error(`Infisical startup failed: ${label}`);
  }
}

export async function loadRuntimeSecrets(env = process.env, fetcher = fetch) {
  if (env.FLOWSTACK_SECRETS_SOURCE !== "infisical") return;
  const target = runtimeTarget(env);
  const metadata = new URL(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/identity",
  );
  metadata.searchParams.set("audience", target.identityId);
  metadata.searchParams.set("format", "full");
  const jwt = await request(
    fetcher,
    "Google identity unavailable",
    metadata,
    {
      headers: { "Metadata-Flavor": "Google" },
    },
    false,
  );
  if (!jwt.trim())
    throw new Error("Infisical startup failed: empty Google identity");
  const login = await request(
    fetcher,
    "GCP authentication rejected",
    `${target.domain}/api/v1/auth/gcp-auth/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identityId: target.identityId, jwt: jwt.trim() }),
    },
  );
  if (typeof login?.accessToken !== "string" || !login.accessToken)
    throw new Error("Infisical startup failed: missing access token");
  const url = new URL(`${target.domain}/api/v4/secrets`);
  url.search = new URLSearchParams({
    projectId: target.projectId,
    environment: target.environment,
    secretPath: target.secretPath,
    expandSecretReferences: "true",
    includeImports: "true",
    includePersonalOverrides: "false",
    recursive: "false",
  }).toString();
  const data = await request(fetcher, "could not fetch secrets", url, {
    headers: { Authorization: `Bearer ${login.accessToken}` },
  });
  if (
    !Array.isArray(data?.secrets) ||
    (data.imports !== undefined && !Array.isArray(data.imports))
  )
    throw new Error("Infisical startup failed: invalid secrets response");
  const allowed = new Set(
    ENV_VARS.filter((v) => v.scope === "server").map((v) => v.name),
  );
  const values = {};
  // Local folder values override imports; later imports override earlier ones.
  for (const group of [
    ...(data.imports || []).map((i) => i.secrets),
    data.secrets,
  ]) {
    if (!Array.isArray(group))
      throw new Error("Infisical startup failed: invalid imported secrets");
    for (const secret of group) {
      if (!allowed.has(secret?.secretKey)) continue;
      if (
        typeof secret.secretValue !== "string" ||
        secret.secretValueHidden ||
        secret.secretValue.includes("\0")
      )
        throw new Error("Infisical startup failed: unreadable secret value");
      values[secret.secretKey] = secret.secretValue;
    }
  }
  const integrations = Object.fromEntries(
    (env.FLOWSTACK_RUNTIME_FEATURES || "")
      .split(":")
      .map((name) => [name, true]),
  );
  const problems = validateEnv(values, {
    scope: "server",
    integrations,
  }).filter((r) => r.status !== "ok");
  if (problems.length)
    throw new Error(
      `Infisical startup failed: invalid or missing variables: ${problems.map((p) => p.name).join(", ")}`,
    );
  // Do not retain stale values from an earlier env-file/Secret Manager deploy.
  for (const name of allowed) delete env[name];
  Object.assign(env, values);
}
