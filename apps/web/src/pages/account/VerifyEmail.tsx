// ** import lib
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ** import components
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FullPageLoading } from "@/components/ui/full-page-loading";
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";

// ** import config
import { AUTH_REDIRECTS } from "@/config/redirects";

// ** import utils
import { authClient } from "@/lib/auth-client";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
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
      navigate("/auth/sign-in", { replace: true });
      return null;
    }

    setEmail(user.email ?? "");
    if (user.emailVerified) {
      navigate(AUTH_REDIRECTS.afterLogin, { replace: true });
      return null;
    }

    return user;
  }, [navigate]);

  useEffect(() => {
    const init = async () => {
      try {
        await refreshStatus();
      } catch {
        navigate("/auth/sign-in", { replace: true });
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
      <div className="min-h-screen bg-background px-6 py-16">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Verify your email</h1>
            <p className="text-muted-foreground text-lg">
              Complete email verification before entering the application.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-8 shadow-sm">
            <Alert className="mb-6">
              <AlertTitle>Action required</AlertTitle>
              <AlertDescription>
                We sent a verification link to{" "}
                <span className="font-medium text-foreground">
                  {email || "your inbox"}
                </span>
                . Open the email and click the verification link, then return here.
              </AlertDescription>
            </Alert>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCheckAgain} disabled={isChecking}>
                {isChecking ? "Checking..." : "I verified, check again"}
              </Button>
              <Button variant="outline" onClick={handleResend} disabled={isSending || !email}>
                {isSending ? "Sending..." : "Resend verification email"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
