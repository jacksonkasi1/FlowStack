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
try {
  for (const mode of ["personal", "organization"])
    for (const frontend of ["react", "tanstack"]) {
      const label = `${mode}-${frontend}`;
      const destination = await generate(sourceRoot, join(root, label), {
        mode,
        frontend,
      });
      await run(destination, `${label}-install`, "bun", ["install"]);
      await run(destination, `${label}-lock`, "bun", [
        "install",
        "--frozen-lockfile",
      ]);
      await run(destination, `${label}-types`, "bun", ["run", "check-types"]);
      await run(destination, `${label}-tests`, "bun", ["run", "test"]);
      await run(destination, `${label}-build`, "bun", ["run", "build"]);
      await run(destination, `${label}-audit`, "bun", ["audit"]);
      // Preserve logs; generated projects are disposable and can be very large.
      await rm(destination, { recursive: true, force: true });
    }
  console.log(`All four presets passed. Logs: ${root}`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
