import { and, eq, gt } from "drizzle-orm";
import {
  db as defaultDb,
  invitation,
  member,
  organization,
  user,
} from "@repo/db";
import {
  APIError,
  createAuthEndpoint,
  sessionMiddleware,
} from "better-auth/api";
import { z } from "zod";
import { INVITATION_CONFIG, MULTI_ORGANIZATION_CONFIG } from "@repo/config";

export function invitationPolicy(db: typeof defaultDb) {
  async function find(id: string) {
    return (
      await db
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.id, id),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1)
    )[0];
  }
  async function pending(email: string) {
    return (
      await db
        .select()
        .from(invitation)
        .where(
          and(
            eq(invitation.email, email.toLowerCase()),
            eq(invitation.status, "pending"),
            gt(invitation.expiresAt, new Date()),
          ),
        )
        .limit(1)
    )[0];
  }
  async function signupInvitation(body: Record<string, unknown> | undefined) {
    if (typeof body?.callbackURL !== "string") return null;
    const url = new URL(body.callbackURL, "http://localhost");
    if (url.pathname !== "/accept-invitation") return null;
    const row = await find(url.searchParams.get("invitationId") || "");
    if (!row)
      throw new APIError("BAD_REQUEST", {
        message: "This invitation is invalid or expired.",
      });
    if (row.email.toLowerCase() !== String(body.email).toLowerCase()) {
      throw new APIError("BAD_REQUEST", {
        message: "Use the email address this invitation was sent to.",
      });
    }
    return row;
  }
  async function canCreate(userId: string) {
    const memberships = await db
      .select({ id: member.id })
      .from(member)
      .where(eq(member.userId, userId))
      .limit(1);
    if (
      memberships.length === 0 &&
      INVITATION_CONFIG.skipOrganizationOnboarding
    ) {
      const account = (
        await db
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, userId))
          .limit(1)
      )[0];
      if (account && (await pending(account.email))) return false;
    }
    return MULTI_ORGANIZATION_CONFIG.enabled || memberships.length === 0;
  }
  return {
    find,
    pending,
    signupInvitation,
    canCreate,
    plugin: {
      id: "flowstack-invitations",
      endpoints: {
        invitationContext: createAuthEndpoint(
          "/invitation/context",
          {
            method: "GET",
            query: z.object({ id: z.string().min(1).max(200) }),
          },
          async (ctx) => {
            const row = await find(ctx.query.id);
            if (!row)
              throw new APIError("NOT_FOUND", {
                message: "This invitation is invalid or expired.",
              });
            const account = await db
              .select({ id: user.id })
              .from(user)
              .where(eq(user.email, row.email))
              .limit(1);
            const org = await db
              .select({ name: organization.name })
              .from(organization)
              .where(eq(organization.id, row.organizationId))
              .limit(1);
            ctx.setHeader("Cache-Control", "no-store");
            return ctx.json({
              email: row.email,
              organizationName: org[0]?.name,
              hasAccount: account.length > 0,
            });
          },
        ),
        pendingInvitation: createAuthEndpoint(
          "/invitation/pending",
          { method: "GET", use: [sessionMiddleware] },
          async (ctx) => {
            const row = INVITATION_CONFIG.skipOrganizationOnboarding
              ? await pending(ctx.context.session.user.email)
              : null;
            ctx.setHeader("Cache-Control", "no-store");
            return ctx.json({ invitationId: row?.id ?? null });
          },
        ),
      },
    },
  };
}
