// ** import core packages
import { db } from "@repo/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  admin,
  bearer,
  organization,
  username,
} from "better-auth/plugins";
import { logger } from "@repo/logs";

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

  /**
   * Modifies better-auth URL callbackURL to point to frontend
   */
  const buildEmailUrlWithFrontendCallback = (
    originalUrl: string,
    frontendPath: string = "/dashboard"
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
   * URL format: http://localhost:8787/api/auth/reset-password/{token}?callbackURL=...
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
      logger.warn(`Failed to parse password reset URL: ${error instanceof Error ? error.message : String(error)}`);
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
        const verificationUrl = buildEmailUrlWithFrontendCallback(url, "/dashboard");

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

    plugins: [
      bearer(),
      username(),
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
