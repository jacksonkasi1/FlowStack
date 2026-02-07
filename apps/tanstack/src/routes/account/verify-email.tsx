// ** import lib
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 py-16">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Verify your email</h1>
            <p className="text-muted-foreground text-lg">
              Complete email verification before entering the application.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Action required</CardTitle>
              <CardDescription>
                We sent a verification link to{" "}
                <span className="font-medium text-foreground">
                  {email || "your inbox"}
                </span>
                . Open the email and click the verification link, then return here.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={handleCheckAgain} disabled={isChecking}>
                {isChecking ? "Checking..." : "I verified, check again"}
              </Button>
              <Button variant="outline" onClick={handleResend} disabled={isSending || !email}>
                {isSending ? "Sending..." : "Resend verification email"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
