// Local-only browser fixture. Never deploy this test server.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readdir, readFile } from "node:fs/promises";
import { Hono } from "hono";
import { cors } from "hono/cors";
import * as schema from "../packages/db/src/schema";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.NODE_ENV = "test";
const { configureAuth } = await import("../packages/auth/src/auth");
const pg = new PGlite();
const dir = new URL("../packages/db/drizzle/", import.meta.url);
for (const file of (await readdir(dir))
  .filter((name) => name.endsWith(".sql"))
  .sort())
  await pg.exec(await readFile(new URL(file, dir), "utf8"));
const database = drizzle(pg, { schema });
const auth = configureAuth(
  {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: "test",
    BETTER_AUTH_URL: "http://localhost:8080",
    FRONTEND_URL: "http://localhost:3100",
    ALLOWED_ORIGINS: "http://localhost:3100,http://localhost:3200",
    BETTER_AUTH_SECRET: "local-browser-test-secret-at-least-32-chars",
    ZEPTOMAIL_API_KEY: "local-test-only",
    EMAIL_FROM_ADDRESS: "test@example.com",
  },
  database as unknown as Parameters<typeof configureAuth>[1],
);
// Email transport is stubbed, so UI tests cannot send actual messages.
globalThis.fetch = (async () =>
  Response.json({ data: [{ code: "EM_101" }] })) as typeof fetch;
const app = new Hono();
app.use(
  "*",
  cors({
    origin: ["http://localhost:3100", "http://localhost:3200"],
    credentials: true,
  }),
);
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 8080,
  fetch: app.fetch,
});
console.log(`Local browser fixture ready on ${server.url}`);
