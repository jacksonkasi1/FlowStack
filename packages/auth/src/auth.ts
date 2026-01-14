// ** import core packages
import { db, user as userTable } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, organization } from "better-auth/plugins";
import { eq } from "drizzle-orm";

// ** import utils
import { sendOrganizationInvitation } from "./email/send-invitation";
import { sendResetPassword } from "./email/send-reset-password";
import { sendVerificationEmail } from "./email/send-verification-email";
import checkUserRole from "./utils/user-is-admin";

// ** import types
import type { Env } from "./types";

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

  const buildCallbackUrl = async (originalUrl: string): Promise<string> => {
    try {
      const urlObj = new URL(originalUrl);
      const pathParts = urlObj.pathname.split("/");
      const token = pathParts[pathParts.length - 1];

      if (!token) {
        return originalUrl;
      }

      return `${frontendURL}/reset-password?token=${token}`;
    } catch {
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
      autoSignIn: false,
      minPasswordLength: 8,
      requireEmailVerification: true,

      sendResetPassword: async ({ user, url }) => {
        const resetUrl = await buildCallbackUrl(url);

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
        const isInvitationSignup = false;

        if (isInvitationSignup) {
          // Auto-verify for invitation signups
          try {
            await db
              .update(userTable)
              .set({ emailVerified: true })
              .where(eq(userTable.email, user.email));
          } catch (error) {
            console.error("Failed to auto-verify email:", error);
          }
          return;
        }

        // Send verification email for normal signups
        await sendVerificationEmail(env, {
          to: { address: user.email, name: user.name || "" },
          url,
        });
      },
    },

    plugins: [
      organization({
        async sendInvitationEmail(data) {
          const inviteLink = `${frontendURL}/accept-invitation/${data.id}`;

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

        allowUserToCreateOrganization: async (user) => {
          return await checkUserRole(user.id, env);
        },
      }),

      admin(),
    ],
  });
}

export type { Session as AuthSession, User as AuthUser } from "better-auth";
