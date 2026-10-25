import { expect, test, afterAll } from "bun:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { configure, generate, parseArgs } from "../scripts/setup.mjs";
const fixtures: string[] = [];
afterAll(async () => {
  for (const path of fixtures) await rm(path, { recursive: true, force: true });
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "flowstack-test-"));
  fixtures.push(root);
  await mkdir(join(root, "packages/config/src/config"), { recursive: true });
  await mkdir(join(root, "apps/server"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ workspaces: ["apps/*", "packages/*"], scripts: {} }),
  );
  await writeFile(
    join(root, "apps/server/.env.example"),
    "EXAMPLE=placeholder",
  );
  return root;
}
test("all four presets configure repeatably and preserve existing env files", async () => {
  for (const mode of ["personal", "organization"])
    for (const frontend of ["react", "tanstack"]) {
      const root = await fixture();
      await writeFile(join(root, "apps/server/.env"), "LOCAL=preserved");
      await configure(root, { mode, frontend });
      await configure(root, { mode, frontend });
      const pkg = JSON.parse(
        await readFile(join(root, "package.json"), "utf8"),
      );
      expect(pkg.workspaces).toContain(
        frontend === "react" ? "apps/web" : "apps/tanstack",
      );
      expect(pkg.workspaces).not.toContain(
        frontend === "react" ? "apps/tanstack" : "apps/web",
      );
      expect(await readFile(join(root, "apps/server/.env"), "utf8")).toBe(
        "LOCAL=preserved",
      );
      expect(
        JSON.parse(await readFile(join(root, ".flowstack.json"), "utf8")).mode,
      ).toBe(mode);
    }
});
test("generated copies exclude secrets and history and refuse nonempty destinations", async () => {
  const root = await fixture();
  await writeFile(join(root, ".env.production"), "SECRET=private");
  await mkdir(join(root, ".git"));
  const output = await mkdtemp(join(tmpdir(), "flowstack-output-"));
  fixtures.push(output);
  await generate(root, output, { mode: "personal", frontend: "react" });
  expect(Bun.file(join(output, ".env.production")).exists()).resolves.toBe(
    false,
  );
  await expect(
    generate(root, output, { mode: "personal", frontend: "react" }),
  ).rejects.toThrow("empty");
  await expect(
    generate(root, join(root, "child"), {
      mode: "personal",
      frontend: "react",
    }),
  ).rejects.toThrow("outside");
});
test("invalid flags fail before changing files", () => {
  expect(() => parseArgs(["--mode", "invalid"])).toThrow();
  expect(() => parseArgs(["--frontend"])).toThrow();
  expect(() => parseArgs(["--unknown"])).toThrow();
});
async function richFixture() {
  const root = await fixture();
  for (const dir of [
    "apps/web/src",
    "apps/tanstack/src/routes",
    "apps/server/.deploy",
  ])
    await mkdir(join(root, dir), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({
      name: "flowstack",
      workspaces: ["apps/*", "packages/*"],
      scripts: {},
    }),
  );
  await writeFile(
    join(root, "apps/web/vite.config.ts"),
    "server: {\n    port: 3000,\n  },",
  );
  await writeFile(
    join(root, "apps/web/index.html"),
    "<title>FlowStack</title>",
  );
  await writeFile(
    join(root, "apps/web/.env.example"),
    "VITE_API_BASE_URL=http://localhost:8080\n",
  );
  await writeFile(
    join(root, "apps/tanstack/package.json"),
    JSON.stringify({ scripts: { dev: "vite dev --port 3000" } }),
  );
  await writeFile(
    join(root, "apps/server/.env.example"),
    "PORT=8080\nBETTER_AUTH_URL=http://localhost:8080\nFRONTEND_URL=http://localhost:3000\nEMAIL_FROM_NAME=FlowStack\n",
  );
  await writeFile(
    join(root, "apps/server/.deploy/deploy.config.yaml"),
    "defaults:\n  artifact_registry: flowstack # repo\nenvironments:\n  prod:\n    service_name: flowstack-server-prod\n",
  );
  return root;
}
const read = (root: string, path: string) => readFile(join(root, path), "utf8");

test("v2 options set name, integrations, ports and generated env files", async () => {
  const root = await richFixture();
  await configure(root, {
    mode: "organization",
    frontend: "react",
    name: "acme-portal",
    enable: ["sentry"],
    disable: ["storage"],
    apiPort: 8181,
    webPort: 3131,
  });
  const config = JSON.parse(await read(root, ".flowstack.json"));
  expect(config).toMatchObject({
    version: 2,
    template: "FlowStack",
    projectName: "acme-portal",
    integrations: {
      email: true,
      storage: false,
      google: false,
      sentry: true,
      infisical: false,
    },
    ports: { api: 8181, web: 3131 },
  });
  expect(typeof config.templateVersion).toBe("string");
  // Only identifiers are recorded: no credentials or tokens.
  expect(JSON.stringify(config)).not.toMatch(/token|password|"secret"/i);
  expect(Object.keys(config.infisical).sort()).toEqual([
    "environments",
    "projectId",
    "secretPath",
  ]);
  const preset = await read(root, "packages/config/src/config/preset.ts");
  expect(preset).toContain(
    'TEMPLATE_MODE: "personal" | "organization" = "organization"',
  );
  expect(preset).toContain("storage: false");
  expect(JSON.parse(await read(root, "package.json")).name).toBe("acme-portal");
  expect(await read(root, "apps/web/vite.config.ts")).toContain("port: 3131,");
  expect(await read(root, "apps/web/index.html")).toBe(
    "<title>Acme Portal</title>",
  );
  expect(await read(root, "apps/server/.deploy/deploy.config.yaml")).toContain(
    "service_name: acme-portal-server-prod",
  );
  const serverEnv = await read(root, "apps/server/.env");
  expect(serverEnv).toContain("PORT=8181");
  expect(serverEnv).toContain("FRONTEND_URL=http://localhost:3131");
  expect(serverEnv).toContain("EMAIL_FROM_NAME=Acme Portal");
  expect(await read(root, "apps/web/.env")).toContain(
    "VITE_API_BASE_URL=http://localhost:8181",
  );
});

test("repeated setup keeps earlier choices and local customisation", async () => {
  const root = await richFixture();
  await configure(root, {
    mode: "personal",
    frontend: "react",
    name: "first-app",
    disable: ["email"],
  });
  // Developer customises a title and an env file after setup.
  await writeFile(join(root, "apps/web/index.html"), "<title>Custom</title>");
  await writeFile(join(root, "apps/server/.env"), "LOCAL=edited");
  const config = JSON.parse(await read(root, ".flowstack.json"));
  config.localNote = "kept";
  await writeFile(join(root, ".flowstack.json"), JSON.stringify(config));
  await configure(root, { mode: "personal", frontend: "tanstack" });
  const next = JSON.parse(await read(root, ".flowstack.json"));
  expect(next.projectName).toBe("first-app");
  expect(next.integrations.email).toBe(false);
  expect(next.frontend).toBe("tanstack");
  expect(next.localNote).toBe("kept");
  expect(next.sourceCommit).toBe(config.sourceCommit);
  expect(await read(root, "apps/web/index.html")).toBe("<title>Custom</title>");
  expect(await read(root, "apps/server/.env")).toBe("LOCAL=edited");
  // Both frontend sources remain on disk.
  expect(await Bun.file(join(root, "apps/web/vite.config.ts")).exists()).toBe(
    true,
  );
});

test("v1 projects upgrade in place without losing their behaviour", async () => {
  const root = await richFixture();
  await writeFile(
    join(root, ".flowstack.json"),
    JSON.stringify({
      template: "FlowStack",
      version: 1,
      sourceCommit: "1234567",
      mode: "organization",
      frontend: "react",
      backend: "node",
    }),
  );
  await configure(root, { mode: "organization", frontend: "react" });
  const config = JSON.parse(await read(root, ".flowstack.json"));
  expect(config.version).toBe(2);
  expect(config.sourceCommit).toBe("1234567");
  // v1 always showed Google sign-in and required storage: unchanged.
  expect(config.integrations.google).toBe(true);
  expect(config.integrations.storage).toBe(true);
});

test("with Infisical, setup writes no server secret files", async () => {
  const root = await richFixture();
  await configure(root, {
    mode: "personal",
    frontend: "react",
    enable: ["infisical"],
    infisicalProjectId: "proj-abc",
  });
  expect(await Bun.file(join(root, "apps/server/.env")).exists()).toBe(false);
  expect(await Bun.file(join(root, "apps/web/.env")).exists()).toBe(true);
  expect(
    JSON.parse(await read(root, ".flowstack.json")).infisical.projectId,
  ).toBe("proj-abc");
});

test("v2 flags are validated before anything changes", () => {
  expect(() => parseArgs(["--name", "Bad Name"])).toThrow(
    "Invalid project name",
  );
  expect(() => parseArgs(["--with", "redis"])).toThrow("Unknown integration");
  expect(() => parseArgs(["--with", "sentry", "--without", "sentry"])).toThrow(
    "both",
  );
  expect(() => parseArgs(["--api-port", "80"])).toThrow();
  expect(() => parseArgs(["--api-port", "3000", "--web-port", "3000"])).toThrow(
    "differ",
  );
  expect(
    parseArgs([
      "--mode",
      "personal",
      "--frontend",
      "react",
      "--with",
      "sentry,infisical",
      "--no-install",
    ]),
  ).toMatchObject({
    mode: "personal",
    frontend: "react",
    enable: ["sentry", "infisical"],
    install: false,
  });
});

test("generated copies keep example env files but not local config or keys", async () => {
  const root = await richFixture();
  await writeFile(join(root, "apps/server/.env.prod.example"), "EXAMPLE=1");
  await writeFile(join(root, "apps/server/.env.prod"), "SECRET=private");
  await writeFile(join(root, ".infisical.json"), "{}");
  await writeFile(
    join(root, ".flowstack.json"),
    JSON.stringify({ version: 2, projectName: "source" }),
  );
  const output = await mkdtemp(join(tmpdir(), "flowstack-output-"));
  fixtures.push(output);
  const { config } = await generate(root, join(output, "new-thing"), {
    mode: "personal",
    frontend: "react",
  });
  expect(
    await Bun.file(
      join(output, "new-thing/apps/server/.env.prod.example"),
    ).exists(),
  ).toBe(true);
  expect(
    await Bun.file(join(output, "new-thing/apps/server/.env.prod")).exists(),
  ).toBe(false);
  expect(
    await Bun.file(join(output, "new-thing/.infisical.json")).exists(),
  ).toBe(false);
  expect(config.projectName).toBe("new-thing");
});
