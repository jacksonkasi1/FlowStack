import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { generate, sourceRoot } from "./setup.mjs";

const root = await mkdtemp(join(tmpdir(), "flowstack-matrix-"));
console.log(`Verifying clean starters in ${root}`);
async function run(cwd, label, executable, args, env = {}) {
  const output = [];
  const child = spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => output.push(data));
  child.stderr.on("data", (data) => output.push(data));
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", resolve);
  });
  const log = join(root, `${label}.log`);
  await writeFile(log, Buffer.concat(output));
  if (code !== 0) throw new Error(`${label} failed (${code}). See ${log}`);
  console.log(`PASS ${label}`);
}
// Sentinel values: builds must never embed confidential values in bundles.
const SENTINELS = {
  BETTER_AUTH_SECRET: "sentinel-better-auth-secret-0000000000000000",
  DATABASE_URL:
    "postgresql://sentinel:sentinel-db-password-000@db.invalid:5432/x",
  R2_SECRET_ACCESS_KEY: "sentinel-r2-secret-access-key-000",
  ZEPTOMAIL_API_KEY: "sentinel-zeptomail-api-key-000",
  GOOGLE_CLIENT_SECRET: "sentinel-google-client-secret-000",
};
const presets = [];
for (const mode of ["personal", "organization"])
  for (const frontend of ["react", "tanstack"])
    presets.push({ label: `${mode}-${frontend}`, mode, frontend, disable: [] });
// Optional integrations switched off.
presets.push({
  label: "personal-react-minimal",
  mode: "personal",
  frontend: "react",
  disable: ["email", "storage", "google"],
});
try {
  for (const { label, mode, frontend, disable } of presets) {
    const { root: destination } = await generate(
      sourceRoot,
      join(root, label),
      {
        mode,
        frontend,
        disable,
      },
    );
    await run(destination, `${label}-install`, "bun", ["install"]);
    await run(destination, `${label}-lock`, "bun", [
      "install",
      "--frozen-lockfile",
    ]);
    await run(destination, `${label}-types`, "bun", ["run", "check-types"]);
    await run(destination, `${label}-tests`, "bun", ["run", "test"]);
    await run(
      destination,
      `${label}-build`,
      "bun",
      ["run", "build"],
      SENTINELS,
    );
    await run(
      destination,
      `${label}-bundle-secrets`,
      "node",
      [
        "scripts/check-bundle-secrets.mjs",
        frontend === "react" ? "apps/web/dist" : "apps/tanstack/.output/public",
      ],
      SENTINELS,
    );
    if (frontend === "tanstack") {
      await run(destination, `${label}-runtime`, "node", [
        "scripts/verify-tanstack-runtime.mjs",
      ]);
    }
    await run(destination, `${label}-audit`, "bun", ["audit"]);
    // Preserve logs; generated projects are disposable and can be very large.
    await rm(destination, { recursive: true, force: true });
  }
  console.log(`All ${presets.length} presets passed. Logs: ${root}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
