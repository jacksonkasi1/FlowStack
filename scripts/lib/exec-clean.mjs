#!/usr/bin/env node
// Runs a command without Infisical credentials in its environment.
// `infisical run` passes its own environment (INFISICAL_TOKEN, Universal Auth
// client credentials) through to the child; the application only needs the
// injected secrets, so those credentials are removed here.
//
//   node scripts/lib/exec-clean.mjs <command...>
import { spawn } from "node:child_process";

const CREDENTIAL =
  /^INFISICAL_(TOKEN|UNIVERSAL_AUTH_|.*CLIENT_SECRET|.*ACCESS_TOKEN)/;

export function withoutInfisicalCredentials(env) {
  return Object.fromEntries(
    Object.entries(env).filter(([name]) => !CREDENTIAL.test(name)),
  );
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: exec-clean.mjs <command...>");
  process.exit(2);
}
const child = spawn(command, args, {
  stdio: "inherit",
  env: withoutInfisicalCredentials(process.env),
});
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.on(signal, () => child.kill(signal));
child.on("error", (error) => {
  console.error(`Could not start ${command}: ${error.message}`);
  process.exit(127);
});
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
