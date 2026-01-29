// ** import core packages
import { db } from "@repo/db";
import {
  organization as organizationTable,
  member as memberTable,
  session as sessionTable,
  user as userTable,
} from "@repo/db";
import { eq } from "drizzle-orm";
import { betterAuth } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  bearer,
  magicLink,
  organization as organizationPlugin,
  username,
} from "better-auth/plugins";
import { onboarding, createOnboardingStep } from "@repo/onboarding";
import { z } from "zod";
import { logger } from "@repo/logs";

// ** import config
import { AUTH_REDIRECTS } from "./config/redirects";
import { CREATOR_ROLE } from "./config/roles";
import { ORGANIZATION_CONFIG } from "./config/organization";
import { isOnboardingEnabled } from "@repo/config";

// ** import utils
import { sendMagicLink } from "./email/send-magic-link";
import { sendOrganizationInvitation } from "./email/send-invitation";
import { sendResetPassword } from "./email/send-reset-password";
import { sendVerificationEmail } from "./email/send-verification-email";
import checkUserRole from "./utils/user-is-admin";

// ** import types
import type { Env } from "./types";

/**
 * Generate a URL-friendly slug from organization name
 * Format: org-name-with-dashes-xxxx (4-char suffix)
 */
function generateOrganizationSlug(name: string): string {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special chars
    .replace(/[\s_-]+/g, "-") // Replace spaces/underscores with dashes
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing dashes

  // Generate a minimal 4-character random suffix
  const randomId = Math.random().toString(36).substring(2, 6);
  return `${normalized}-${randomId}`;
}

export function configureAuth(env: Env): ReturnType<typeof betterAuth> {
  if (!env.BETTER_AUTH_URL) {
    throw new Error("BETTER_AUTH_URL environment variable is required");
  }
  if (!env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL environment variable is required");
  }

  const baseURL = env.BETTER_AUTH_URL;
  const frontendURL = env.FRONTEND_URL;

  const trustedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
    : [];

  if (!trustedOrigins.includes(frontendURL)) {
    trustedOrigins.push(frontendURL);
  }

  const cookieDomain = env.DOMAIN;
  const isSecure = baseURL.startsWith("https://");

  const socialProviders: Record<string, unknown> = {};

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    socialProviders.google = {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      prompt: "select_account",
    };
  }

  /**
   * Modifies better-auth URL callbackURL to point to frontend
   */
  const buildEmailUrlWithFrontendCallback = (
    originalUrl: string,
    frontendPath: string = AUTH_REDIRECTS.afterLogin,
  ): string => {
    try {
      const urlObj = new URL(originalUrl);
      // Replace the callbackURL param to point to frontend
      urlObj.searchParams.set("callbackURL", `${frontendURL}${frontendPath}`);
      return urlObj.toString();
    } catch {
      logger.warn("Failed to parse URL, returning original");
      return originalUrl;
    }
  };

  /**
   * Extracts token from better-auth URL and builds frontend reset password URL
   * URL format: http://localhost:8080/api/auth/reset-password/{token}?callbackURL=...
   */
  const buildPasswordResetFrontendUrl = (originalUrl: string): string => {
    try {
      const urlObj = new URL(originalUrl);

      // Extract token from pathname (last segment)
      const pathParts = urlObj.pathname.split("/").filter(Boolean);
      const token = pathParts[pathParts.length - 1];

      if (!token || token === "reset-password") {
        logger.warn("No token found in password reset URL path");
        return originalUrl;
      }

      // Direct link to frontend reset password page with token
      return `${frontendURL}/reset-password?token=${token}`;
    } catch (error) {
      logger.warn(
        `Failed to parse password reset URL: ${error instanceof Error ? error.message : String(error)}`,
      );
      return originalUrl;
    }
  };

  return betterAuth({
    baseURL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
    }),
    trustedOrigins,
    socialProviders,

    account: {
      accountLinking: {
        enabled: true,
        trustedProviders: ["google"],
      },
    },



    advanced: {
      useSecureCookies: isSecure,
      cookiePrefix: "better-auth",
      crossSubDomainCookies: {
        enabled: false,
      },
      defaultCookieAttributes: {
        sameSite: "lax",
        secure: isSecure,
        httpOnly: true,
        path: "/",
        domain: env.NODE_ENV === "production" ? cookieDomain : undefined,
      },
    },

    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },

    emailAndPassword: {
      enabled: true,
      autoSignIn: true, // Auto sign-in after signup for immediate dashboard access
      minPasswordLength: 8,
      requireEmailVerification: false, // Non-blocking - handled via banner in frontend

      sendResetPassword: async ({ user, url }) => {
        // Direct link to frontend reset password form with token
        const resetUrl = buildPasswordResetFrontendUrl(url);

        await sendResetPassword(env, {
          from: {
            address: env.EMAIL_FROM_ADDRESS || "noreply@example.com",
            name: env.EMAIL_FROM_NAME || "FlowStack",
          },
          to: {
            address: user.email,
            name: user.name || "",
          },
          subject: "Reset your password",
          url: resetUrl,
        });
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        // Backend URL with frontend callbackURL - server will redirect after verification
        const verificationUrl = buildEmailUrlWithFrontendCallback(
          url,
          AUTH_REDIRECTS.afterEmailVerification,
        );

        try {
          await sendVerificationEmail(env, {
            to: { address: user.email, name: user.name || "" },
            url: verificationUrl,
          });
        } catch (error) {
          logger.error(
            `Failed to send verification email: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      },
    },

    hooks: {
      after: createAuthMiddleware(async (ctx) => {
        // Only run on get-session endpoint
        if (ctx.path !== "/get-session") {
          return;
        }

        // In after hooks, session might be in different places
        const ctxSession = ctx.context.session as any;
        const returnedData = (ctx.context as any).returned as any;

        logger.info(`[hooks.after] get-session called. ctxSession exists: ${!!ctxSession}, returned exists: ${!!returnedData}`);

        // Try to find session data from either location
        const sessionData = ctxSession?.session || returnedData?.session;
        const userData = ctxSession?.user || returnedData?.user;

        // Skip if no session data or already has active org
        if (!sessionData || sessionData.activeOrganizationId) {
          logger.info(`[hooks.after] Skipping: sessionData=${!!sessionData}, activeOrg=${sessionData?.activeOrganizationId}`);
          return;
        }

        if (!userData) {
          logger.info(`[hooks.after] Skipping: no user data`);
          return;
        }

        try {
          // Get user's memberships
          const memberships = await db
            .select()
            .from(memberTable)
            .where(eq(memberTable.userId, userData.id));

          logger.info(`[hooks.after] User ${userData.id} has ${memberships.length} org(s)`);

          // If exactly 1 org, set it as active
          if (memberships.length === 1) {
            const orgId = memberships[0].organizationId;

            // Update session in database
            await db
              .update(sessionTable)
              .set({ activeOrganizationId: orgId })
              .where(eq(sessionTable.id, sessionData.id));

            logger.info(
              `Auto-activated org ${orgId} for user ${userData.id} (single org fallback)`,
            );
          }

          // Bidirectional sync between org membership and onboarding state
          if (memberships.length > 0) {
            // User HAS org membership - clear onboarding if set
            const user = await db
              .select({ shouldOnboard: userTable.shouldOnboard })
              .from(userTable)
              .where(eq(userTable.id, userData.id))
              .limit(1);

            if (user.length > 0 && user[0].shouldOnboard) {
              // User has org but shouldOnboard is true - clear it
              await db
                .update(userTable)
                .set({
                  shouldOnboard: false,
                  currentOnboardingStep: null,
                })
                .where(eq(userTable.id, userData.id));

              logger.info(
                `Cleared onboarding for user ${userData.id} (has organization membership)`,
              );
            }
          } else if (ORGANIZATION_CONFIG.requireOrganization) {
            // User has NO membership and requireOrganization is enabled - force onboarding
            const user = await db
              .select({ shouldOnboard: userTable.shouldOnboard })
              .from(userTable)
              .where(eq(userTable.id, userData.id))
              .limit(1);

            if (user.length > 0 && !user[0].shouldOnboard) {
              // User has no org and onboarding is not set - re-enable it
              await db
                .update(userTable)
                .set({
                  shouldOnboard: true,
                  currentOnboardingStep: "createOrganization",
                })
                .where(eq(userTable.id, userData.id));

              logger.info(
                `Re-enabled onboarding for user ${userData.id} (no organization membership)`,
              );
            }
          }
        } catch (error) {
          logger.error(
            `Failed to auto-set active org: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }),
    },

    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            try {
              // Get the user's first organization (as owner or member)
              const userMemberships = await db
                .select()
                .from(memberTable)
                .where(eq(memberTable.userId, session.userId))
                .limit(1);

              if (userMemberships.length > 0) {
                return {
                  data: {
                    ...session,
                    activeOrganizationId: userMemberships[0].organizationId,
                  },
                };
              }

              return { data: session };
            } catch (error) {
              logger.error(
                `Failed to set active organization: ${error instanceof Error ? error.message : String(error)}`,
              );
              return { data: session };
            }
          },
        },
      },
    },

    plugins: [
      bearer(),
      username(),
      magicLink({
        async sendMagicLink({ email, url }) {
          // Use front end URL with callback
          const magicLinkUrl = buildEmailUrlWithFrontendCallback(
            url,
            AUTH_REDIRECTS.afterMagicLink,
          );

          await sendMagicLink(env, {
            to: {
              address: email,
              name: "",
            },
            url: magicLinkUrl,
          });
        },
      }),
      organizationPlugin({
        async sendInvitationEmail(data: {
          id: string;
          email: string;
          organization: { name: string };
          inviter: { user: { name: string; email: string } };
        }) {
          const inviteLink = `${frontendURL}${AUTH_REDIRECTS.organizationInvitation}?invitationId=${data.id}`;

          await sendOrganizationInvitation(env, {
            from: {
              address: env.EMAIL_FROM_ADDRESS || "noreply@example.com",
              name: env.EMAIL_FROM_NAME || "FlowStack",
            },
            to: {
              address: data.email,
              name: "New User",
            },
            subject: `You've been invited to join ${data.organization.name}!`,
            invitedByUsername: data.inviter.user.name,
            invitedByEmail: data.inviter.user.email,
            teamName: data.organization.name,
            inviteLink,
          });
        },

        allowUserToCreateOrganization: async (user: { id: string }) => {
          return await checkUserRole(user.id, env);
        },

        // Organization hooks for handling invitation acceptance
        organizationHooks: {
          // When user accepts invitation, skip onboarding since they're joining an existing org
          afterAcceptInvitation: async ({ user }) => {
            try {
              // Mark onboarding as complete - user joined via invitation, no need to create org
              await db
                .update(userTable)
                .set({
                  shouldOnboard: false,
                  currentOnboardingStep: null,
                })
                .where(eq(userTable.id, user.id));

              logger.info(
                `Cleared onboarding for user ${user.id} after accepting invitation`,
              );
            } catch (error) {
              logger.error(
                `Failed to clear onboarding after invitation: ${error instanceof Error ? error.message : String(error)}`,
              );
            }
          },
        },
      }),

      admin(),

      // Onboarding plugin with multi-step wizard
      onboarding({
        steps: {
          // Step 1: Create organization (required)
          createOrganization: createOnboardingStep({
            input: z.object({
              organizationName: z
                .string()
                .min(2, "Organization name must be at least 2 characters")
                .max(100, "Organization name must be less than 100 characters"),
              logo: z.string().optional(),
            }),
            async handler(ctx) {
              const { organizationName, logo } = ctx.body;
              const session = ctx.context.session;

              if (!session) {
                throw new Error("User must be authenticated");
              }

              const userId = session.user.id;

              // Create organization
              const orgId = crypto.randomUUID();
              const slug = generateOrganizationSlug(organizationName);

              await db.insert(organizationTable).values({
                id: orgId,
                name: organizationName,
                slug,
                logo: logo || null,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              // Add user as owner
              await db.insert(memberTable).values({
                id: crypto.randomUUID(),
                organizationId: orgId,
                userId,
                role: CREATOR_ROLE,
                createdAt: new Date(),
              });

              logger.info(
                `Created organization "${organizationName}" (${slug}) for user ${userId} via onboarding`,
              );

              // Set the new org as active in the current session
              if (session.session?.id) {
                await db
                  .update(sessionTable)
                  .set({ activeOrganizationId: orgId })
                  .where(eq(sessionTable.id, session.session.id));

                logger.info(`Set org ${orgId} as active for session ${session.session.id}`);
              }

              return { organizationId: orgId, organizationName, slug };
            },
            required: true,
            once: true,
            order: 1,
          }),

          // Step 2: Invite members (optional, can be skipped)
          inviteMembers: createOnboardingStep({
            input: z.object({
              emails: z.array(z.string().email()).optional(),
            }),
            async handler(ctx) {
              const { emails } = ctx.body;
              const session = ctx.context.session;

              if (!session || !emails || emails.length === 0) {
                return { invited: [] };
              }

              // Get user's organization
              const membership = await db
                .select()
                .from(memberTable)
                .where(eq(memberTable.userId, session.user.id))
                .limit(1);

              if (membership.length === 0) {
                return { invited: [] };
              }

              // Invitations will be handled by the organization plugin
              // This step just marks completion
              logger.info(
                `User ${session.user.id} completed invite step with ${emails.length} emails`,
              );

              return { invited: emails };
            },
            required: false, // Can be skipped
            once: true,
            order: 2,
          }),
        },
        completionStep: "inviteMembers",
        onboardingPath: "/onboarding",

        // Skip onboarding for users signing up via invitation link
        // They will join an existing organization, not create a new one
        autoEnableOnSignUp: (ctx) => {
          // Check if onboarding is enabled globally
          if (!isOnboardingEnabled()) {
            return false;
          }

          try {
            // Check if signup includes a redirect to invitation acceptance
            const url = ctx.request?.url;
            if (!url) return true;

            const urlObj = new URL(url);
            const redirectTo = urlObj.searchParams.get("redirectTo") || "";

            // If redirecting to accept-invitation, skip onboarding
            if (redirectTo.includes("/accept-invitation")) {
              logger.info("Skipping onboarding for user signing up via invitation");
              return false;
            }

            return true;
          } catch {
            return true;
          }
        },
      }),
    ],
  });
}

export type { Session as AuthSession, User as AuthUser } from "better-auth";

// Export type for auth instance (for client-side type inference)
export type auth = ReturnType<typeof configureAuth>;
