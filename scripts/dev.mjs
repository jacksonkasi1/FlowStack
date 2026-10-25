#!/usr/bin/env node
// Starts the API and the selected frontend.
//
//   bun run dev          Infisical development secrets when the project enabled
//                        Infisical, otherwise local .env files.
//   bun run dev:secrets  Always use Infisical development secrets.
//   bun run dev:local    Always use local .env files.
//
// When Infisical is selected and fails, this exits with an error instead of
// quietly switching to .env files or another environment.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readProjectConfig, frontendApp } from "./lib/project-config.mjs";
import { runWithSecrets } from "./secrets.mjs";
import { isMain } from "./lib/is-main.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function turboDevCommand(config, root) {
  const bin = join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "turbo.cmd" : "turbo",
  );
  const filters = config?.frontend
    ? ["--filter=server", `--filter=${frontendApp(config.frontend)}`]
    : [];
  return [existsSync(bin) ? bin : "turbo", "run", "dev", ...filters];
}

export function chooseSource(args, config) {
  if (args.includes("--secrets") && args.includes("--local"))
    throw new Error("Choose either --secrets or --local, not both");
  if (args.includes("--secrets")) return "infisical";
  if (args.includes("--local")) return "local";
  return config?.integrations?.infisical ? "infisical" : "local";
}

async function main(args) {
  const config = await readProjectConfig(root);
  const command = turboDevCommand(config, root);
  const source = chooseSource(args, config);
  if (source === "local") {
    console.log(
      "Using local .env files. (Infisical is not enabled; see docs/advanced/secrets-infisical.md.)",
    );
    const child = spawn(command[0], command.slice(1), {
      cwd: root,
      stdio: "inherit",
    });
    child.on("exit", (code) => (process.exitCode = code ?? 1));
    return;
  }
  console.log("Loading development secrets from Infisical…");
  const code = await runWithSecrets("development", command);
  if (code) {
    console.error(
      "\nDevelopment did not start with Infisical secrets. Fix the Infisical error above (`infisical login`, project access), or run `bun run dev:local` to use local .env files instead.",
    );
    process.exitCode = code;
  }
}

if (isMain(import.meta.url)) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
