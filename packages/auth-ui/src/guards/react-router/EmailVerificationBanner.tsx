/**
 * EmailVerificationBanner (React Router DOM version)
 *
 * Displays a banner when user's email is not verified.
 * Works standalone - no provider needed.
 */

// ** import lib
import { useState, useCallback, useEffect } from "react";
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@repo/onboarding/client";
import { useLocation } from "react-router-dom";

// ** import types
import type { ReactNode } from "react";

interface EmailVerificationBannerProps {
    /**
     * Custom banner content
     */
    children?: ReactNode;
}

export function EmailVerificationBanner({ children }: EmailVerificationBannerProps) {
    const location = useLocation();
    const [showBanner, setShowBanner] = useState(false);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Routes that shouldn't show the banner
    const hiddenRoutes = ["/auth", "/onboarding", "/reset-password"];

    useEffect(() => {
        const checkVerification = async () => {
            // Hide on certain routes
            if (hiddenRoutes.some((r) => location.pathname.startsWith(r))) {
                setShowBanner(false);
                return;
            }

            try {
                const authClient = createAuthClient({
                    plugins: [organizationClient(), adminClient(), onboardingClient()],
                });

                const result = await authClient.getSession();
                const user = result.data?.user;

                if (user && !user.emailVerified) {
                    setShowBanner(true);
                } else {
                    setShowBanner(false);
                }
            } catch {
                setShowBanner(false);
            }
        };

        checkVerification();
    }, [location.pathname]);

    const handleResend = useCallback(async () => {
        if (sending || sent) return;

        setSending(true);
        try {
            const authClient = createAuthClient({
                plugins: [organizationClient(), adminClient(), onboardingClient()],
            });

            const result = await authClient.getSession();
            const email = result.data?.user?.email;

            if (email) {
                await authClient.sendVerificationEmail({ email });
                setSent(true);
                setTimeout(() => setSent(false), 60000);
            }
        } catch (error) {
            console.error("Failed to send verification email:", error);
        } finally {
            setSending(false);
        }
    }, [sending, sent]);

    if (!showBanner) return null;

    if (children) {
        return <>{children}</>;
    }

    return (
        <div className="bg-amber-50 dark:bg-amber-950/50 border-b border-amber-200 dark:border-amber-800 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-sm text-amber-800 dark:text-amber-200">
                <span>Please verify your email address.</span>
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
