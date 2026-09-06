import { beforeAll, afterAll, expect, test, spyOn } from "bun:test";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { readFile, readdir } from "node:fs/promises";
import { eq } from "drizzle-orm";
import * as schema from "../packages/db/src/schema";
import { AUTH_MODE_CONFIG } from "../packages/config/src/config/auth-mode";

let pg: PGlite;
let database: ReturnType<typeof drizzle<typeof schema>>;
let configureAuth: typeof import("../packages/auth/src/auth").configureAuth;
let fetchSpy: ReturnType<typeof spyOn>;
const emails: string[] = [];
const env = {
  BETTER_AUTH_URL: "http://localhost:8080",
  FRONTEND_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "integration-test-secret-only-at-least-32-chars",
  NODE_ENV: "test",
  ZEPTOMAIL_API_KEY: "test-not-a-real-key",
  EMAIL_FROM_ADDRESS: "test@example.com",
};
const originalConfig = { ...AUTH_MODE_CONFIG };
beforeAll(async () => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
  pg = new PGlite();
  const dir = new URL("../packages/db/drizzle/", import.meta.url);
  for (const file of (await readdir(dir))
    .filter((name) => name.endsWith(".sql"))
    .sort()) {
    await pg.exec(await readFile(new URL(file, dir), "utf8"));
  }
  database = drizzle(pg, { schema });
  ({ configureAuth } = await import("../packages/auth/src/auth"));
  fetchSpy = spyOn(globalThis, "fetch").mockImplementation(
    async (_input, init) => {
      // Integration tests never send real mail or contact external services.
      emails.push(String(init?.body || ""));
      return Response.json({
        data: [{ code: "EM_101", message: "Email request received" }],
      });
    },
  );
}, 30000);
afterAll(async () => {
  Object.assign(AUTH_MODE_CONFIG, originalConfig);
  fetchSpy?.mockRestore();
  await pg?.close();
});
function client(mode: "simple" | "organization") {
  Object.assign(AUTH_MODE_CONFIG, {
    mode,
    requireOrganization: mode === "organization",
    enableOnboarding: mode === "organization",
  });
  const auth = configureAuth(
    env,
    database as unknown as Parameters<typeof configureAuth>[1],
  );
  const cookies = new Map<string, string>();
  return {
    auth,
    async request(path: string, body?: unknown) {
      const response = await auth.handler(
        new Request(`http://localhost:8080/api/auth${path}`, {
          method: body ? "POST" : "GET",
          headers: {
            "Content-Type": "application/json",
            Origin: env.FRONTEND_URL,
            Cookie: [...cookies]
              .map(([key, value]) => `${key}=${value}`)
              .join("; "),
          },
          body: body ? JSON.stringify(body) : undefined,
        }),
      );
      for (const cookie of response.headers.getSetCookie()) {
        const part = cookie.split(";")[0];
        const index = part.indexOf("=");
        cookies.set(part.slice(0, index), part.slice(index + 1));
      }
      return response;
    },
  };
}
test("personal signup, cached session, login and disabled organization endpoints", async () => {
  const c = client("simple");
  const signup = await c.request("/sign-up/email", {
    email: "personal@example.com",
    password: "CorrectPassword123!",
    name: "Personal",
  });
  expect(signup.status).toBe(200);
  const data = await signup.json();
  expect(data.user.email).toBe("personal@example.com");
  expect((await (await c.request("/get-session")).json()).user.id).toBe(
    data.user.id,
  );
  expect((await c.request("/organization/list")).status).toBe(404);
  expect((await c.request("/onboarding/status")).status).toBe(404);
  expect((await c.request("/sign-out", {})).status).toBe(200);
  expect(
    (
      await c.request("/sign-in/email", {
        email: "personal@example.com",
        password: "WrongPassword123!",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await c.request("/sign-in/email", {
        email: "personal@example.com",
        password: "CorrectPassword123!",
      })
    ).status,
  ).toBe(200);
}, 30000);
test("organization onboarding refreshes cached cookies after create and skip; cannot skip required setup", async () => {
  const c = client("organization");
  const signup = await c.request("/sign-up/email", {
    email: "owner@example.com",
    password: "CorrectPassword123!",
    name: "Owner",
    shouldOnboard: false,
  });
  expect(signup.status).toBe(200);
  expect((await signup.json()).user.email).toBe("owner@example.com");
  expect(
    (await c.request("/onboarding/skip-step/invite-members", {})).status,
  ).toBe(403);
  const created = await c.request("/onboarding/step/create-organization", {
    organizationName: "Test Team",
  });
  expect(created.status).toBe(200);
  const session = await (await c.request("/get-session")).json();
  expect(session.session.activeOrganizationId).toBeTruthy();
  expect(session.user.currentOnboardingStep).toBe("inviteMembers");
  expect(
    (await c.request("/onboarding/skip-step/invite-members", {})).status,
  ).toBe(200);
  const done = await (await c.request("/get-session")).json();
  expect(done.user.shouldOnboard).toBe(false);
  expect(done.user.currentOnboardingStep).toBeNull();
  expect(
    (
      await c.request("/onboarding/step/create-organization", {
        organizationName: "Duplicate",
      })
    ).status,
  ).toBe(403);
  const rows = await database
    .select()
    .from(schema.member)
    .where(eq(schema.member.userId, done.user.id));
  expect(rows).toHaveLength(1);
}, 30000);

test("email verification and password reset work with the upgraded auth package", async () => {
  const c = client("simple");
  expect(
    (
      await c.request("/sign-up/email", {
        email: "reset@example.com",
        password: "CorrectPassword123!",
        name: "Reset",
      })
    ).status,
  ).toBe(200);
  const html = JSON.parse(emails.at(-1)!).htmlbody as string;
  const link = html
    .match(/href="([^"]*\/verify-email\?[^"]+)"/)?.[1]
    ?.replaceAll("&amp;", "&");
  expect(link).toBeTruthy();
  const url = new URL(link!);
  expect(
    (await c.request(url.pathname.replace("/api/auth", "") + url.search))
      .status,
  ).toBe(302);
  expect(
    (await (await c.request("/get-session")).json()).user.emailVerified,
  ).toBe(true);
  expect(
    (
      await c.request("/request-password-reset", {
        email: "reset@example.com",
        redirectTo: "/reset-password",
      })
    ).status,
  ).toBe(200);
  const verifications = await database.select().from(schema.verification);
  const reset = verifications.find((row) =>
    row.identifier.startsWith("reset-password:"),
  );
  expect(reset).toBeTruthy();
  expect(
    (
      await c.request("/reset-password", {
        token: reset!.identifier.slice("reset-password:".length),
        newPassword: "ReplacementPassword123!",
      })
    ).status,
  ).toBe(200);
  expect(
    (
      await c.request("/sign-in/email", {
        email: "reset@example.com",
        password: "CorrectPassword123!",
      })
    ).status,
  ).toBe(401);
  expect(
    (
      await c.request("/sign-in/email", {
        email: "reset@example.com",
        password: "ReplacementPassword123!",
      })
    ).status,
  ).toBe(200);
}, 30000);

test("invitation acceptance requires the invited verified user and refreshes onboarding state", async () => {
  const owner = client("organization");
  await database
    .update(schema.user)
    .set({ emailVerified: true })
    .where(eq(schema.user.email, "owner@example.com"));
  expect(
    (
      await owner.request("/sign-in/email", {
        email: "owner@example.com",
        password: "CorrectPassword123!",
      })
    ).status,
  ).toBe(200);
  const invite = await owner.request("/organization/invite-member", {
    email: "invited@example.com",
    role: "member",
  });
  expect(invite.status).toBe(200);
  const invitation = await invite.json();
  expect(
    (
      await owner.request("/organization/accept-invitation", {
        invitationId: invitation.id,
      })
    ).status,
  ).toBe(403);
  const invited = client("organization");
  const signup = await invited.request("/sign-up/email", {
    email: "invited@example.com",
    password: "CorrectPassword123!",
    name: "Invited",
  });
  expect(signup.status).toBe(200);
  expect(
    (
      await invited.request("/organization/accept-invitation", {
        invitationId: invitation.id,
      })
    ).status,
  ).toBe(403);
  const html = JSON.parse(emails.at(-1)!).htmlbody as string;
  const link = html
    .match(/href="([^"]*\/verify-email\?[^"]+)"/)?.[1]
    ?.replaceAll("&amp;", "&");
  const url = new URL(link!);
  await invited.request(url.pathname.replace("/api/auth", "") + url.search);
  expect(
    (
      await invited.request("/organization/accept-invitation", {
        invitationId: invitation.id,
      })
    ).status,
  ).toBe(200);
  const session = await (await invited.request("/get-session")).json();
  expect(session.user.shouldOnboard).toBe(false);
  expect(session.session.activeOrganizationId).toBe(invitation.organizationId);
  expect([400, 403]).toContain(
    (
      await invited.request("/organization/remove-member", {
        memberIdOrEmail: "owner@example.com",
        organizationId: invitation.organizationId,
      })
    ).status,
  );
  expect(
    await database
      .select()
      .from(schema.member)
      .where(eq(schema.member.organizationId, invitation.organizationId)),
  ).toHaveLength(2);
}, 30000);
