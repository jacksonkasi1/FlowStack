// Exercise Turbo's actual strict-environment filtering with an isolated app.
import { expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("development tasks receive injected proxy and database settings through Turbo", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "flowstack-dev-env-"));
  const source = join(import.meta.dir, "..");
  try {
    await mkdir(join(fixture, "apps/server"), { recursive: true });
    await writeFile(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "env-fixture",
        private: true,
        packageManager: "bun@1.3.14",
        workspaces: ["apps/server"],
      }),
    );
    await writeFile(
      join(fixture, "apps/server/package.json"),
      JSON.stringify({ name: "server", scripts: { dev: "node check.cjs" } }),
    );
    await writeFile(
      join(fixture, "turbo.json"),
      await readFile(join(source, "turbo.json")),
    );
    const expected = {
      AUTH_TRUSTED_PROXIES: "10.0.0.1",
      AUTH_IP_HEADERS: "x-forwarded-for",
      DATABASE_DRIVER: "postgres",
      DATABASE_POOL_MAX: "3",
    };
    await writeFile(
      join(fixture, "apps/server/check.cjs"),
      `console.log('ENV_RESULT:' + JSON.stringify(Object.fromEntries(${JSON.stringify(Object.keys(expected))}.map(key => [key, process.env[key]]))));`,
    );
    const env = {
      PATH: process.env.PATH,
      CI: "true",
      TURBO_TELEMETRY_DISABLED: "1",
      ...expected,
    };
    const install = Bun.spawn(["bun", "install", "--ignore-scripts"], {
      cwd: fixture,
      env,
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await install.exited).toBe(0);
    const task = Bun.spawn(
      [
        join(source, "node_modules/.bin/turbo"),
        "run",
        "dev",
        "--filter=server",
      ],
      { cwd: fixture, env, stdout: "pipe", stderr: "pipe" },
    );
    const [stdout, stderr, code] = await Promise.all([
      new Response(task.stdout).text(),
      new Response(task.stderr).text(),
      task.exited,
    ]);
    expect(code, stderr).toBe(0);
    const match = /ENV_RESULT:(\{.*\})/.exec(stdout);
    expect(match).not.toBeNull();
    expect(JSON.parse(match![1])).toEqual(expected);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
}, 30000);
