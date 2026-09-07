import { expect, test } from "bun:test";
import { Hono } from "hono";
import {
  uploadQuery,
  fileQuery,
  listQuery,
  ownsPath,
  userPrefix,
  organizationPrefix,
} from "../apps/server/src/routes/storage/validation";
const app = new Hono()
  .get("/upload", uploadQuery, (c) => c.json(c.req.valid("query")))
  .get("/file", fileQuery, (c) => c.json(c.req.valid("query")))
  .get("/list", listQuery, (c) => c.json(c.req.valid("query")));
test("Hono zValidator validates real Zod 4 query schemas and coerces numbers", async () => {
  expect(
    (await app.request("/upload?fileName=avatar.png&contentType=image/png"))
      .status,
  ).toBe(200);
  expect((await app.request("/upload")).status).toBe(400);
  expect((await app.request("/upload?fileName=../secret")).status).toBe(400);
  expect((await app.request("/file?filePath=uploads/../secret")).status).toBe(
    400,
  );
  expect((await app.request("/list?maxKeys=-1")).status).toBe(400);
  expect((await app.request("/list?maxKeys=1.5")).status).toBe(400);
  expect((await app.request("/list?maxKeys=1001")).status).toBe(400);
  expect(await (await app.request("/list?maxKeys=20")).json()).toEqual({
    maxKeys: 20,
  });
});
test("storage namespaces cannot cross users or organizations", () => {
  const scopes = [userPrefix("alice"), organizationPrefix("team-a")];
  expect(ownsPath("uploads/users/alice/avatar.png", scopes)).toBe(true);
  expect(ownsPath("uploads/organizations/team-a/report.pdf", scopes)).toBe(
    true,
  );
  for (const path of [
    "uploads/users/bob/avatar.png",
    "uploads/organizations/team-b/report.pdf",
    "uploads/users/alice-other/a",
    "uploads/users/alice/../bob/a",
  ]) {
    expect(ownsPath(path, scopes)).toBe(false);
  }
});
