// One production build configuration for deployment and runtime regression tests.
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (
  args.length &&
  (args.length !== 2 ||
    args[0] !== "--outdir" ||
    !args[1] ||
    args[1].startsWith("--"))
) {
  console.error("Usage: bun scripts/build-server.mjs [--outdir <directory>]");
  process.exit(1);
}

process.env.NODE_ENV = "production";
const result = await Bun.build({
  entrypoints: [resolve(root, "apps/server/src/index.ts")],
  outdir: args[1] ? resolve(args[1]) : resolve(root, "apps/server/dist"),
  target: "node",
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  // NODE_ENV alone can leave Bun emitting jsxDEV calls against React's
  // production runtime, where jsxDEV is undefined (breaking all auth emails).
  jsx: { runtime: "automatic", development: false },
});
if (!result.success) {
  for (const message of result.logs) console.error(message);
  process.exit(1);
}
