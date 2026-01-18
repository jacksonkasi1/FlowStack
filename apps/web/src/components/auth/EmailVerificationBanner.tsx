// ** import lib
import { useState } from "react";
import { Mail, X, RefreshCw } from "lucide-react";

// ** import utils
import { authClient } from "@/lib/auth-client";

// ** import components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Email Verification Banner
 *
 * Shows a non-blocking banner when user's email is not verified.
 * Allows resending verification email with loading state.
 */
export function EmailVerificationBanner() {
    const { data: session, isPending } = authClient.useSession();
    const [isResending, setIsResending] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    // Don't show if loading, dismissed, or email is verified
    if (isPending || isDismissed) return null;
    if (!session?.user) return null;
    if (session.user.emailVerified) return null;

    const handleResendVerification = async () => {
        setIsResending(true);
        setMessage(null);

        try {
            await authClient.sendVerificationEmail({
                email: session.user.email,
                callbackURL: window.location.href,
            });
            setMessage("Verification email sent! Check your inbox.");
        } catch {
            setMessage("Failed to send email. Please try again.");
        } finally {
            setIsResending(false);
        }
    };

    return (
        <Alert className="relative border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
            <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="flex items-center justify-between gap-4">
                <span className="text-amber-800 dark:text-amber-200">
                    {message || (
                        <>
                            Please verify your email address <strong>{session.user.email}</strong>
                        </>
                    )}
                </span>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleResendVerification}
                        disabled={isResending}
                        className="border-amber-300 bg-white hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900 dark:hover:bg-amber-800"
                    >
                        {isResending ? (
                            <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                            <Mail className="mr-1 h-3 w-3" />
                        )}
                        Resend
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsDismissed(true)}
                        className="h-6 w-6 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-800"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </AlertDescription>
        </Alert>
    );
}
