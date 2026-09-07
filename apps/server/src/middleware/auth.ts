import { db, member } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { isOrganizationMode } from "@repo/config";
import { userPrefix, organizationPrefix } from "../routes/storage/validation";
// ** import types
import type { Context, Next } from "hono";

// ** import utils
import { configureAuth } from "@repo/auth";
import { env } from "@/config";

let authInstance: ReturnType<typeof configureAuth> | null = null;

function getAuthInstance(): ReturnType<typeof configureAuth> {
  if (!authInstance) {
    authInstance = configureAuth(env);
  }
  return authInstance;
}

export async function authMiddleware(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const auth = getAuthInstance();
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
  });

  c.set("session", session?.session || null);
  c.set("user", session?.user || null);

  if (session?.user) {
    const prefixes = [userPrefix(session.user.id)];
    const orgId = (session.session as { activeOrganizationId?: string })
      .activeOrganizationId;
    if (isOrganizationMode() && orgId) {
      const membership = await db
        .select({ id: member.id })
        .from(member)
        .where(
          and(
            eq(member.userId, session.user.id),
            eq(member.organizationId, orgId),
          ),
        )
        .limit(1);
      if (membership.length) prefixes.push(organizationPrefix(orgId));
    }
    c.set("storagePrefixes", prefixes);
  }
  return next();
}

export async function requireAuth(
  c: Context,
  next: Next,
): Promise<Response | void> {
  const session = c.get("session");

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  return next();
}
