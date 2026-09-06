// ** import lib
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { FullPageLoading } from "@/components/ui/full-page-loading";
import { ProtectedRoute } from "@repo/auth-ui/guards/tanstack-router";

// ** import utils
import { authClient } from "@/lib/auth-client";

// ** import config
import { AUTH_REDIRECTS } from "@/config/redirects";

export const Route = createFileRoute("/account/verify-email")({
  component: VerifyEmailPage,
});

function VerifyEmailPage() {
  const navigate = Route.useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [email, setEmail] = useState<string>("");

  const refreshStatus = useCallback(async () => {
    const result = await authClient.getSession({
      fetchOptions: { cache: "no-store" },
    });
    const user = result.data?.user as any;

    if (!user) {
      navigate({
        to: "/auth/$authView",
        params: { authView: "sign-in" },
        replace: true,
      });
      return null;
    }

    setEmail(user.email ?? "");
    if (user.emailVerified) {
      navigate({ to: AUTH_REDIRECTS.afterLogin, replace: true });
      return null;
    }

    return user;
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshStatus();
      } catch {
        navigate({
          to: "/auth/$authView",
          params: { authView: "sign-in" },
          replace: true,
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [navigate, refreshStatus]);

  const handleResend = async () => {
    if (!email || isSending) return;
    setIsSending(true);
    try {
      await authClient.sendVerificationEmail({ email });
      toast.success("Verification email sent");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to send verification email",
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleCheckAgain = async () => {
    if (isChecking) return;
    setIsChecking(true);
    try {
      const user = await refreshStatus();
      if (user && !user.emailVerified) {
        toast.info("Email is still not verified yet");
      }
    } catch {
      toast.error("Failed to refresh verification status");
    } finally {
      setIsChecking(false);
    }
  };

  if (isLoading) {
    return <FullPageLoading />;
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <section className="mx-auto w-full max-w-md px-6 py-20 sm:py-28">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify your email
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Open the verification link sent to{' '}
            <span className="font-medium text-foreground [overflow-wrap:anywhere]">
              {email || 'your inbox'}
            </span>{' '}
            to continue.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button onClick={handleCheckAgain} disabled={isChecking}>
              {isChecking ? 'Checking...' : 'Continue'}
            </Button>
            <Button
              variant="link"
              className="px-0 text-muted-foreground"
              onClick={handleResend}
              disabled={isSending || !email}
            >
              {isSending ? 'Sending...' : 'Resend email'}
            </Button>
          </div>
        </section>
      </AppLayout>
    </ProtectedRoute>
  )
}
