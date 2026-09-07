import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const child = spawn(
  process.execPath,
  ["apps/tanstack/.output/server/index.mjs"],
  {
    cwd: resolve(import.meta.dirname, ".."),
    env: { ...process.env, PORT: "3299", HOST: "127.0.0.1" },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
child.stdout.on("data", (data) => {
  logs += data;
});
child.stderr.on("data", (data) => {
  logs += data;
});
const exited = new Promise((resolve) => child.on("exit", resolve));
try {
  let ready = false;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${logs}`);
    if (logs.includes("Listening")) {
      ready = true;
      break;
    }
    await delay(100);
  }
  if (!ready) throw new Error(`Server did not start: ${logs}`);
  const started = Date.now();
  const response = await fetch("http://127.0.0.1:3299/auth/sign-in", {
    signal: AbortSignal.timeout(5000),
  });
  const html = await response.text();
  if (!response.ok || !html.includes("FlowStack"))
    throw new Error("Missing application HTML");
  console.log(
    `PASS TanStack HTML response completed in ${Date.now() - started}ms (${html.length} characters)`,
  );
} catch (error) {
  console.error(`TanStack runtime failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  child.kill("SIGTERM");
  await Promise.race([exited, delay(6000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
