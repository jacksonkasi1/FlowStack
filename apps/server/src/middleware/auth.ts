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
  });

  c.set("session", session?.session || null);
  c.set("user", session?.user || null);

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
