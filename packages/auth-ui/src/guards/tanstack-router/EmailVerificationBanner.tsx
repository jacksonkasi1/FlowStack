/**
 * EmailVerificationBanner (TanStack Router version)
 *
 * Displays a banner when user's email is not verified.
 * Works standalone - no provider needed.
 */

// ** import lib
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@repo/onboarding/client";

// ** import hooks
import { useEmailVerificationStatus } from "./useEmailVerificationStatus";

// ** import types
import type { ReactNode } from "react";
import type { EmailVerificationMode } from "../../types";

interface EmailVerificationBannerProps {
  /**
   * Verification behavior mode.
   * Banner renders only when mode is "banner".
   * @default "banner"
   */
  mode?: EmailVerificationMode;

  /**
   * Better Auth client instance
   */
  authClient?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSession: (...args: any[]) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendVerificationEmail?: (...args: any[]) => Promise<any>;
  };

  /**
   * Routes where banner should be hidden
   */
  hiddenRoutes?: string[];

  /**
   * Banner text
   */
  message?: string;

  /**
   * Custom banner content
   */
  children?: ReactNode;
}

export function EmailVerificationBanner({
  mode = "banner",
  authClient,
  hiddenRoutes = ["/auth", "/onboarding", "/reset-password"],
  message = "Verify your email to unlock full access.",
  children,
}: EmailVerificationBannerProps) {
  const location = useLocation();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { user, isVerified, isPending, refetch } = useEmailVerificationStatus({
    authClient,
  });

  const shouldHideForRoute = hiddenRoutes.some((r) =>
    location.pathname.startsWith(r),
  );
  const showBanner =
    mode === "banner" &&
    !shouldHideForRoute &&
    !isPending &&
    !!user &&
    !isVerified;

  useEffect(() => {
    if (!showBanner) {
      setSent(false);
    }
  }, [showBanner]);

  const handleResend = useCallback(async () => {
    if (sending || sent || !user?.email) {
      return;
    }

    setSending(true);
    try {
      const client =
        authClient ||
        createAuthClient({
          plugins: [organizationClient(), adminClient() as any, onboardingClient()],
        });

      if (!client.sendVerificationEmail) {
        return;
      }

      await client.sendVerificationEmail({ email: user.email });
      setSent(true);
      setTimeout(() => setSent(false), 60000);
      await refetch();
    } catch (error) {
      console.error("Failed to send verification email:", error);
    } finally {
      setSending(false);
    }
  }, [authClient, refetch, sending, sent, user?.email]);

  if (!showBanner) return null;

  if (children) {
    return <>{children}</>;
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
      <div className="flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <span>{message}</span>
        <button
          onClick={handleResend}
          disabled={sending || sent}
          className="underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sent ? "Sent!" : sending ? "Sending..." : "Resend verification email"}
        </button>
      </div>
    </div>
  );
}

