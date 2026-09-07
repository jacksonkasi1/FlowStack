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
