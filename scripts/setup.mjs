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
import { resolve, dirname, relative, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import {
  DEFAULT_INTEGRATIONS,
  DEFAULT_PORTS,
  INTEGRATIONS,
  TEMPLATE_VERSION,
  displayName,
  frontendApp,
  normalizeProjectConfig,
  readProjectConfig,
  suggestProjectName,
  validateProjectName,
  writeProjectConfig,
} from "./lib/project-config.mjs";
import { isMain } from "./lib/is-main.mjs";
import { toolchainChecks } from "./lib/toolchain.mjs";
import { existsSync } from "node:fs";

export const sourceRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
);

const USAGE = `bun run setup [options]

  --mode personal|organization   Account model
  --frontend react|tanstack      Frontend
  --name <project-name>          Project name (lowercase, digits, hyphens)
  --with <list>                  Enable integrations: ${INTEGRATIONS.join(",")}
  --without <list>               Disable integrations
  --api-port <port>              API port (default ${DEFAULT_PORTS.api})
  --web-port <port>              Frontend port (default ${DEFAULT_PORTS.web})
  --infisical-project-id <id>    Infisical project ID (not a secret)
  --output <dir>                 Generate a separate copy in an empty directory
  --no-install                   Skip bun install (and the environment checks)
  --migrate                      Apply pending development migrations without asking
  --yes                          Accept defaults for confirmations (implies --migrate)
  --skip-checks                  Skip secrets, database and doctor checks after install
  --help

Interactive when --mode or --frontend is missing and a terminal is attached.`;

function parseList(value, flag) {
  const items = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  for (const item of items)
    if (!INTEGRATIONS.includes(item))
      throw new Error(
        `Unknown integration for ${flag}: ${item}. Use ${INTEGRATIONS.join(", ")}`,
      );
  return items;
}

function parsePort(value, flag) {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error(`${flag} must be an integer between 1024 and 65535`);
  return port;
}

export function parseArgs(args) {
  const options = { install: true, enable: [], disable: [] };
  const valued = [
    "--mode",
    "--frontend",
    "--output",
    "--name",
    "--with",
    "--without",
    "--api-port",
    "--web-port",
    "--infisical-project-id",
  ];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--no-install") options.install = false;
    else if (arg === "--migrate") options.migrate = true;
    else if (arg === "--yes") options.yes = true;
    else if (arg === "--skip-checks") options.skipChecks = true;
    else if (arg === "--help") options.help = true;
    else if (valued.includes(arg)) {
      const value = args[++i];
      if (!value || value.startsWith("--"))
        throw new Error(`Missing value for ${arg}`);
      if (arg === "--with") options.enable.push(...parseList(value, arg));
      else if (arg === "--without")
        options.disable.push(...parseList(value, arg));
      else if (arg === "--api-port") options.apiPort = parsePort(value, arg);
      else if (arg === "--web-port") options.webPort = parsePort(value, arg);
      else if (arg === "--infisical-project-id")
        options.infisicalProjectId = value;
      else options[arg.slice(2)] = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.mode && !["personal", "organization"].includes(options.mode))
    throw new Error("Mode must be personal or organization");
  if (options.frontend && !["react", "tanstack"].includes(options.frontend))
    throw new Error("Frontend must be react or tanstack");
  if (options.name) {
    const problem = validateProjectName(options.name);
    if (problem) throw new Error(`Invalid project name: ${problem}`);
  }
  const both = options.enable.filter((item) => options.disable.includes(item));
  if (both.length)
    throw new Error(
      `Integration both enabled and disabled: ${both.join(", ")}`,
    );
  if (options.apiPort && options.apiPort === options.webPort)
    throw new Error("API and frontend ports must differ");
  return options;
}

/** Resolves when the port can be bound locally. */
export function isPortFree(port) {
  return new Promise((resolvePort) => {
    const server = createServer();
    server.once("error", () => resolvePort(false));
    server.listen(port, () => server.close(() => resolvePort(true)));
  });
}

async function readText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

/** Rewrites a file only when a known default is present, so edits survive. */
async function replaceInFile(path, pattern, replacement) {
  const text = await readText(path);
  if (text === null) return false;
  const next = text.replace(pattern, replacement);
  if (next === text) return false;
  await writeFile(path, next);
  return true;
}

function presetSource(mode, integrations) {
  const features = {
    email: integrations.email,
    storage: integrations.storage,
    googleAuth: integrations.google,
  };
  return `// Written by bun run setup. These choices are shared by the frontend and API.
export const TEMPLATE_MODE: "personal" | "organization" = ${JSON.stringify(mode)};

/** Optional integrations selected during setup. Core auth and database are always on. */
export const TEMPLATE_FEATURES = ${JSON.stringify(features, null, 2).replace(/"(\w+)":/g, "$1:")} as const;
`;
}

function renderEnvExample(text, { ports, projectName }) {
  let out = text
    .replaceAll("localhost:8080", `localhost:${ports.api}`)
    .replaceAll("localhost:3000", `localhost:${ports.web}`)
    .replace(/^PORT=\d+$/m, `PORT=${ports.api}`);
  if (projectName)
    out = out.replace(
      /^EMAIL_FROM_NAME=FlowStack$/m,
      `EMAIL_FROM_NAME=${displayName(projectName)}`,
    );
  return out;
}

function sourceCommitOf(root) {
  const top = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: root,
    encoding: "utf8",
  });
  const git = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  return top.stdout?.trim() === root && git.status === 0
    ? git.stdout.trim()
    : "unknown";
}

/**
 * Applies a preset to a checkout. Safe to run repeatedly: existing .env files
 * are never overwritten, files are only rewritten where FlowStack defaults are
 * still present, and unused frontend sources are kept.
 */
export async function configure(root, options) {
  const { mode, frontend } = options;
  if (
    !["personal", "organization"].includes(mode) ||
    !["react", "tanstack"].includes(frontend)
  )
    throw new Error("Choose a valid mode and frontend");
  const previous = await readProjectConfig(root);
  const app = frontendApp(frontend);
  const path = join(root, "package.json");
  const pkg = JSON.parse(await readFile(path, "utf8"));

  const projectName =
    options.name ||
    previous?.projectName ||
    (pkg.name !== "flowstack" ? pkg.name : null);
  const integrations = {
    ...DEFAULT_INTEGRATIONS,
    ...(previous?.integrations || {}),
    ...(options.integrations || {}),
  };
  for (const item of options.enable || []) integrations[item] = true;
  for (const item of options.disable || []) integrations[item] = false;
  const ports = {
    ...DEFAULT_PORTS,
    ...(previous?.ports || {}),
    ...(options.apiPort ? { api: options.apiPort } : {}),
    ...(options.webPort ? { web: options.webPort } : {}),
  };
  if (ports.api === ports.web)
    throw new Error("API and frontend ports must differ");

  pkg.workspaces = ["apps/server", `apps/${app}`, "packages/*"];
  if (projectName) pkg.name = projectName;
  pkg.scripts.dev = "node scripts/dev.mjs";
  pkg.scripts["dev:local"] = "node scripts/dev.mjs --local";
  pkg.scripts["dev:secrets"] = "node scripts/dev.mjs --secrets";
  // Email preview is a separate tool, not part of starting the application.
  pkg.scripts["dev:email"] = "bun run --cwd packages/email-templates dev";
  await writeFile(path, JSON.stringify(pkg, null, 2) + "\n");
  await writeFile(
    join(root, "packages/config/src/config/preset.ts"),
    presetSource(mode, integrations),
  );

  // Ports: only the known default declarations are rewritten.
  await replaceInFile(
    join(root, "apps/web/vite.config.ts"),
    /port: \d+,/,
    `port: ${ports.web},`,
  );
  await replaceInFile(
    join(root, "apps/tanstack/package.json"),
    /"vite dev --port \d+"/,
    `"vite dev --port ${ports.web}"`,
  );

  if (projectName) {
    const title = displayName(projectName);
    await replaceInFile(
      join(root, "apps/web/index.html"),
      "<title>FlowStack</title>",
      `<title>${title}</title>`,
    );
    await replaceInFile(
      join(root, "apps/tanstack/src/routes/__root.tsx"),
      "title: 'FlowStack'",
      `title: '${title.replaceAll("'", "\\'")}'`,
    );
    await replaceInFile(
      join(root, "apps/server/.deploy/deploy.config.yaml"),
      /service_name: flowstack-server-/g,
      `service_name: ${projectName}-server-`,
    );
    await replaceInFile(
      join(root, "apps/server/.deploy/deploy.config.yaml"),
      /artifact_registry: flowstack(\s)/,
      `artifact_registry: ${projectName}$1`,
    );
  }

  let sourceCommit = previous?.sourceCommit || "unknown";
  if (sourceCommit === "unknown") sourceCommit = sourceCommitOf(root);
  const config = normalizeProjectConfig({
    ...(previous || {}),
    version: 2,
    templateVersion:
      previous?.templateVersion && previous.templateVersion !== "1.x"
        ? previous.templateVersion
        : TEMPLATE_VERSION,
    sourceCommit,
    projectName,
    mode,
    frontend,
    backend: "node",
    integrations,
    ports,
    infisical: {
      ...(previous?.infisical || {}),
      ...(options.infisicalProjectId
        ? { projectId: options.infisicalProjectId }
        : {}),
    },
  });
  await writeProjectConfig(root, config);

  // With Infisical, server secrets are injected at runtime: no plaintext secret
  // files are created. Frontend .env files only hold public VITE_* values.
  const envDirs = integrations.infisical
    ? [`apps/${app}`]
    : ["apps/server", `apps/${app}`];
  const created = [];
  for (const dir of envDirs) {
    const destination = join(root, dir, ".env");
    try {
      await access(destination);
    } catch {
      const example = await readText(join(root, dir, ".env.example"));
      if (example === null) continue;
      await writeFile(
        destination,
        renderEnvExample(example, { ports, projectName }),
        { flag: "wx" },
      );
      created.push(`${dir}/.env`);
    }
  }
  return { config, created };
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
    ".infisical.json",
    "gcp-service-account.json",
    ".flowstack.json",
    ".flowstack-backup",
    ".flowstack-upgrade",
  ]);
  await mkdir(target, { recursive: true });
  await cp(source, target, {
    recursive: true,
    filter(path) {
      const parts = relative(source, path).split("/");
      return !parts.some(
        (part) =>
          omitted.has(part) ||
          (part.startsWith(".env") && !part.endsWith(".example")),
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
      version: 2,
      templateVersion: TEMPLATE_VERSION,
      sourceCommit: git.status === 0 ? git.stdout.trim() : "unknown",
    }),
  );
  const name = options.name || suggestProjectName(basename(target));
  return { root: target, ...(await configure(target, { ...options, name })) };
}

async function ask(rl, question, choices, fallback) {
  while (true) {
    const answer =
      (await rl.question(question)).trim().toLowerCase() || fallback;
    if (answer in choices) return choices[answer];
  }
}

async function interactive(options, previous) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (!options.name) {
      const fallback =
        previous?.projectName ||
        suggestProjectName(
          options.output
            ? basename(resolve(options.output))
            : basename(sourceRoot),
        );
      while (!options.name) {
        const answer =
          (await rl.question(`Project name [${fallback}]: `)).trim() ||
          fallback;
        const problem = validateProjectName(answer);
        if (problem) console.log(`  ${problem}`);
        else options.name = answer;
      }
    }
    options.mode ||= await ask(
      rl,
      "Account model: 1) Personal  2) Organization [1]: ",
      {
        1: "personal",
        2: "organization",
        personal: "personal",
        organization: "organization",
      },
      "1",
    );
    options.frontend ||= await ask(
      rl,
      "Frontend: 1) React + React Router  2) TanStack Start [1]: ",
      { 1: "react", 2: "tanstack", react: "react", tanstack: "tanstack" },
      "1",
    );
    const current = {
      ...DEFAULT_INTEGRATIONS,
      ...(previous?.integrations || {}),
    };
    const labels = {
      email: "Email (ZeptoMail)",
      storage: "File storage (Cloudflare R2)",
      google: "Google sign-in",
      sentry: "Sentry monitoring",
      infisical: "Infisical secrets",
    };
    console.log(
      "Optional integrations (authentication and database are always included):",
    );
    for (const item of INTEGRATIONS) {
      if (options.enable.includes(item) || options.disable.includes(item))
        continue;
      const enabled = await ask(
        rl,
        `  ${labels[item]}? ${current[item] ? "[Y/n]" : "[y/N]"}: `,
        { y: true, yes: true, n: false, no: false },
        current[item] ? "y" : "n",
      );
      (enabled ? options.enable : options.disable).push(item);
    }
    if (
      options.enable.includes("infisical") &&
      !options.infisicalProjectId &&
      !previous?.infisical?.projectId
    ) {
      const id = (
        await rl.question(
          "  Infisical project ID (Project Settings; blank to add later): ",
        )
      ).trim();
      if (id) options.infisicalProjectId = id;
    }
    for (const [key, flag, label] of [
      ["apiPort", "api", "API"],
      ["webPort", "web", "Frontend"],
    ]) {
      if (options[key]) continue;
      const port = previous?.ports?.[flag] || DEFAULT_PORTS[flag];
      if (await isPortFree(port)) continue;
      const answer = (
        await rl.question(
          `  ${label} port ${port} is in use. Port to use [${port}]: `,
        )
      ).trim();
      if (answer) options[key] = parsePort(answer, label);
    }
  } finally {
    rl.close();
  }
}

async function reusePrevious(previous) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const summary = `${previous.projectName || "project"}: ${previous.mode} / ${previous.frontend}`;
    const answer = (
      await rl.question(
        `Existing setup found (${summary}). Reuse these choices? [Y/n]: `,
      )
    )
      .trim()
      .toLowerCase();
    return !answer || answer === "y" || answer === "yes";
  } finally {
    rl.close();
  }
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log(USAGE);
    return;
  }
  for (const check of toolchainChecks(sourceRoot)) {
    if (check.status === "FAIL")
      throw new Error(`${check.name} ${check.detail}: ${check.fix}`);
    if (check.status === "WARN")
      console.warn(`! ${check.name} ${check.detail}. ${check.fix}`);
  }
  const previous = options.output ? null : await readProjectConfig(sourceRoot);
  if (!options.mode || !options.frontend) {
    if (!process.stdin.isTTY)
      throw new Error("Non-interactive setup requires --mode and --frontend");
    // Rerunning setup resumes: reuse earlier choices instead of asking again.
    if (
      previous?.mode &&
      previous?.frontend &&
      (await reusePrevious(previous))
    ) {
      options.mode ||= previous.mode;
      options.frontend ||= previous.frontend;
    } else await interactive(options, previous);
  }
  const result = options.output
    ? await generate(sourceRoot, options.output, options)
    : { root: sourceRoot, ...(await configure(sourceRoot, options)) };
  const { root, config, created } = result;

  const warnings = [];
  for (const [label, port] of [
    ["API", config.ports.api],
    ["Frontend", config.ports.web],
  ])
    if (!(await isPortFree(port)))
      warnings.push(
        `${label} port ${port} is in use. Stop that process or rerun setup with --${label === "API" ? "api" : "web"}-port.`,
      );
  if (config.integrations.infisical && !config.infisical.projectId)
    warnings.push(
      "Infisical is enabled but no project ID is set. Rerun setup with --infisical-project-id <id>.",
    );

  if (options.install) {
    const install = spawnSync("bun", ["install"], {
      cwd: root,
      stdio: "inherit",
    });
    if (install.error || install.status !== 0)
      throw new Error(
        "Installation failed. Resolve the error and run bun install again.",
      );
  }

  const enabled = INTEGRATIONS.filter((item) => config.integrations[item]);
  const canCheck =
    !options.skipChecks &&
    existsSync(join(root, "node_modules", ".bin", "turbo"));
  const secretsStep = config.integrations.infisical
    ? "Add development secrets to Infisical (see docs/advanced/secrets-infisical.md), then `infisical login`."
    : "Fill in apps/server/.env (replace every placeholder).";
  console.log(`
FlowStack ${TEMPLATE_VERSION} setup complete

  Project       ${config.projectName || "(unnamed)"}
  Location      ${root}
  Account model ${config.mode}
  Frontend      ${config.frontend === "react" ? "React + React Router" : "TanStack Start"} (apps/${frontendApp(config.frontend)})
  API           Hono on Node.js (apps/server)
  Ports         API ${config.ports.api}, frontend ${config.ports.web}
  Integrations  ${enabled.length ? enabled.join(", ") : "none"}
  Source commit ${config.sourceCommit}
  Env files     ${created.length ? `created ${created.join(", ")}` : "none created (existing files kept)"}
${warnings.map((w) => `\n  ! ${w}`).join("")}`);
  if (canCheck) {
    // Runs in its own process: it needs installed dependencies, which this
    // script must not import (setup runs before anything is installed).
    const flags = [
      ...(options.migrate || options.yes ? ["--migrate"] : []),
      ...(process.stdin.isTTY ? [] : ["--non-interactive"]),
    ];
    const onboarding = spawnSync(
      process.execPath,
      [join(root, "scripts/onboard.mjs"), ...flags],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    if (onboarding.status !== 0)
      console.warn(
        "\nEnvironment checks could not finish. Rerun `bun run setup` (it resumes) or `bun run doctor`.",
      );
    return;
  }
  console.log(`Next steps:
  1. ${secretsStep}
  2. bun run doctor       check the environment
  3. bun run db:migrate   ${config.integrations.infisical ? "(or db:migrate:secrets) " : ""}apply database migrations
  4. bun run dev          start the API and frontend
${options.install ? "" : "\n  Dependencies were not installed: run bun install first."}`);
}

if (isMain(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
