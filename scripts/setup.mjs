#!/usr/bin/env node
import {
  readFile,
  writeFile,
  mkdir,
  cp,
  readdir,
  access,
  realpath,
} from "node:fs/promises";
import { resolve, dirname, relative, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";

export const sourceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);
export function parseArgs(args) {
  const options = { install: true };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--no-install") options.install = false;
    else if (arg === "--help") options.help = true;
    else if (["--mode", "--frontend", "--output"].includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${arg}`);
      options[arg.slice(2)] = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.mode && !["personal", "organization"].includes(options.mode))
    throw new Error("Mode must be personal or organization");
  if (options.frontend && !["react", "tanstack"].includes(options.frontend))
    throw new Error("Frontend must be react or tanstack");
  return options;
}

export async function configure(root, { mode, frontend }) {
  if (
    !["personal", "organization"].includes(mode) ||
    !["react", "tanstack"].includes(frontend)
  )
    throw new Error("Choose a valid mode and frontend");
  const app = frontend === "react" ? "web" : "tanstack";
  const path = join(root, "package.json");
  const pkg = JSON.parse(await readFile(path, "utf8"));
  pkg.workspaces = ["apps/server", `apps/${app}`, "packages/*"];
  pkg.scripts.dev = `turbo run dev --filter=server --filter=${app}`;
  // Email preview is a separate tool, not part of starting the application.
  pkg.scripts["dev:email"] = "bun run --cwd packages/email-templates dev";
  await writeFile(path, JSON.stringify(pkg, null, 2) + "\n");
  await writeFile(
    join(root, "packages/config/src/config/preset.ts"),
    `// Written by bun run setup. This choice is shared by the frontend and API.\nexport const TEMPLATE_MODE: "personal" | "organization" = ${JSON.stringify(mode)};\n`,
  );
  let sourceCommit = "unknown";
  try {
    sourceCommit = JSON.parse(
      await readFile(join(root, ".flowstack.json"), "utf8"),
    ).sourceCommit;
  } catch {
    /* First setup. */
  }
  if (sourceCommit === "unknown") {
    const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: root,
      encoding: "utf8",
    });
    const git = spawnSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    });
    if (top.stdout.trim() === root && git.status === 0)
      sourceCommit = git.stdout.trim();
  }
  await writeFile(
    join(root, ".flowstack.json"),
    JSON.stringify(
      {
        template: "FlowStack",
        version: 1,
        sourceCommit,
        mode,
        frontend,
        backend: "node",
      },
      null,
      2,
    ) + "\n",
  );
  for (const dir of ["apps/server", `apps/${app}`, "packages/db"]) {
    const example = join(root, dir, ".env.example");
    const destination = join(root, dir, ".env");
    try {
      await access(destination);
    } catch {
      try {
        await cp(example, destination, { errorOnExist: true, force: false });
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
    }
  }
}

export async function generate(source, destination, options) {
  const target = resolve(destination);
  let parent = target;
  const suffix = [];
  while (true) {
    try {
      parent = await realpath(parent);
      break;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      suffix.unshift(parent.slice(dirname(parent).length + 1));
      parent = dirname(parent);
    }
  }
  const rel = relative(await realpath(source), join(parent, ...suffix));
  if (!rel || (!rel.startsWith("..") && !rel.startsWith("/")))
    throw new Error("Output must be outside the source repository");
  try {
    if ((await readdir(target)).length)
      throw new Error("Output directory must be empty");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const omitted = new Set([
    ".git",
    "node_modules",
    "dist",
    ".output",
    ".turbo",
    ".nitro",
    ".tanstack",
    ".vinxi",
    ".explorer",
    "coverage",
    ".DS_Store",
    ".npmrc",
    "gcp-service-account.json",
  ]);
  await mkdir(target, { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter(path) {
      const parts = relative(source, path).split("/");
      return !parts.some(
        (part) =>
          omitted.has(part) ||
          (part.startsWith(".env") && part !== ".env.example"),
      );
    },
  });
  const git = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: source,
    encoding: "utf8",
  });
  await writeFile(
    join(target, ".flowstack.json"),
    JSON.stringify({
      sourceCommit: git.status === 0 ? git.stdout.trim() : "unknown",
    }),
  );
  await configure(target, options);
  return target;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(
      "bun run setup [--mode personal|organization] [--frontend react|tanstack] [--output ../my-app] [--no-install]",
    );
    return;
  }
  if (!options.mode || !options.frontend) {
    if (!process.stdin.isTTY)
      throw new Error("Non-interactive setup requires --mode and --frontend");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    try {
      while (!options.mode) {
        const answer =
          (
            await rl.question(
              "Account model: 1) Personal  2) Organization [1]: ",
            )
          ).trim() || "1";
        options.mode = {
          1: "personal",
          2: "organization",
          personal: "personal",
          organization: "organization",
        }[answer];
      }
      while (!options.frontend) {
        const answer =
          (
            await rl.question(
              "Frontend: 1) React + React Router  2) TanStack Start [1]: ",
            )
          ).trim() || "1";
        options.frontend = {
          1: "react",
          2: "tanstack",
          react: "react",
          tanstack: "tanstack",
        }[answer];
      }
    } finally {
      rl.close();
    }
  }
  const root = options.output
    ? await generate(sourceRoot, options.output, options)
    : sourceRoot;
  if (!options.output) await configure(root, options);
  if (options.install) {
    const result = spawnSync("bun", ["install"], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error || result.status !== 0)
      throw new Error(
        "Installation failed. Resolve the error and run bun install again.",
      );
  }
  console.log(
    `\nReady: ${options.mode} / ${options.frontend} / Node.js\nLocation: ${root}\nFill in apps/server/.env and packages/db/.env, then run bun run dev.\nSee docs/getting-started/template-setup.md for database setup and optional cleanup.`,
  );
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
