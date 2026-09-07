/**
 * Refresh the Better Auth session cookie cache after a mutation.
 *
 * Better Auth caches the session payload (session + user fields) in a signed
 * cookie (`session.cookieCache`) so subsequent `/get-session` requests can be
 * answered without hitting the database. When we mutate session-bearing rows
 * directly (e.g. `sessionTable.activeOrganizationId`, `userTable.shouldOnboard`,
 * `userTable.currentOnboardingStep`), the cookie cache becomes stale and
 * downstream guards (RequireOnboarding) will read the OLD values until the
 * cache expires, causing redirect loops.
 *
 * This helper re-reads the live session + user from the database via
 * `ctx.context.internalAdapter.findSession` and re-issues the signed session
 * cookie via Better Auth's `setSessionCookie` helper, which internally calls
 * `setCookieCache`. After this runs, the very next request will see the fresh
 * session values.
 *
 * Reference: better-auth v1.4.x `src/cookies/index.ts` (setSessionCookie /
 * setCookieCache) and `src/api/routes/update-user.ts` which uses the same
 * pattern after `internalAdapter.updateUser`.
 */

// ** import lib
import { setSessionCookie } from "better-auth/cookies";

// ** import logs
import { logger } from "@repo/logs";

// ** import types
import type { GenericEndpointContext } from "better-auth";

/**
 * Re-read the session for the current request from the database and refresh
 * the signed session cookie (including the cookie cache).
 *
 * Safe to call from any authenticated endpoint handler (`use: [sessionMiddleware]`).
 * No-op if no session is attached to the request context.
 */
export async function refreshSessionCookie(
  ctx: GenericEndpointContext,
): Promise<void> {
  try {
    const currentSession = ctx.context.session as
      { session?: { token?: string } } | null | undefined;
    const sessionToken =
      currentSession?.session?.token ||
      (await ctx.getSignedCookie(
        ctx.context.authCookies.sessionToken.name,
        ctx.context.secret,
      ));

    if (!sessionToken) {
      // No session on this request - nothing to refresh.
      return;
    }

    const fresh = await ctx.context.internalAdapter.findSession(sessionToken);

    if (!fresh) {
      // Session was deleted concurrently - leave cookie alone, /get-session
      // will clean it up on the next request.
      return;
    }

    await setSessionCookie(ctx, {
      session: fresh.session,
      user: fresh.user,
    });
  } catch (error) {
    // Never let cookie refresh failures break the mutation - log and continue.
    // Worst case: cookie cache is stale for `cookieCache.maxAge` seconds.
    logger.error(
      `Failed to refresh session cookie cache: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
