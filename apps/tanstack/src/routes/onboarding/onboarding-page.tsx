// ** import types
import type { FormEvent } from "react";

// ** import lib
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

// ** import components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FullPageLoading } from "@/components/ui/full-page-loading";

// ** import config
import { APP_URLS } from "@/config/urls";
import { AUTH_REDIRECTS } from "@/config/redirects";

// ** import utils
import { authClient } from "@/lib/auth-client";

interface OnboardingProps {
  step?: "createOrganization" | "inviteMembers";
}

const STEPS = {
  createOrganization: {
    title: "Create Your Organization",
    description: "Set up your workspace to get started",
    path: "/onboarding/create-organization",
    order: 1,
  },
  inviteMembers: {
    title: "Invite Team Members",
    description: "Add colleagues to your organization (optional)",
    path: "/onboarding/invite-members",
    order: 2,
  },
};

const STEP_ORDER = ["createOrganization", "inviteMembers"] as const;

async function callOnboardingApi(
  endpoint: string,
  data?: Record<string, unknown>,
) {
  const response = await fetch(
    `${APP_URLS.api}/api/auth/onboarding/${endpoint}`,
    {
      method: data ? "POST" : "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: data ? JSON.stringify(data) : undefined,
    },
  );

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export default function OnboardingPage({ step }: OnboardingProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string | null>(step || null);
  const [organizationName, setOrganizationName] = useState("");
  const [inviteEmails, setInviteEmails] = useState("");

  useEffect(() => {
    const checkAuthAndStatus = async () => {
      try {
        const sessionResult = await authClient.getSession();
        const user = sessionResult.data?.user as any;

        if (!user) {
          setIsRedirecting(true);
          // TanStack auth route expects /auth/$authView
          navigate({ to: "/auth/$authView", params: { authView: "sign-in" }, replace: true });
          return;
        }

        if (!user.shouldOnboard) {
          setIsRedirecting(true);
          navigate({ to: AUTH_REDIRECTS.afterLogin as any, replace: true });
          return;
        }

        const serverStep = user.currentOnboardingStep || "createOrganization";

        if (!step) {
          const stepPath = (STEPS as any)[serverStep]?.path;
          if (stepPath) {
            setIsRedirecting(true);
            navigate({ to: stepPath as any, replace: true });
            return;
          }
        }

        if (step && step !== serverStep) {
          const completedSteps = JSON.parse(user.completedOnboardingSteps || "[]");
          if (!completedSteps.includes(step)) {
            const stepPath = (STEPS as any)[serverStep]?.path;
            if (stepPath) {
              setIsRedirecting(true);
              navigate({ to: stepPath as any, replace: true });
              return;
            }
          }
        }

        setCurrentStep(step || serverStep);
      } catch {
        setIsRedirecting(true);
        navigate({ to: "/auth/$authView", params: { authView: "sign-in" }, replace: true });
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkAuthAndStatus();
  }, [step, navigate]);

  const handleOrganizationSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!organizationName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    setIsLoading(true);
    try {
      await callOnboardingApi("step/create-organization", {
        organizationName: organizationName.trim(),
      });
      toast.success("Organization created!");
      navigate({ to: STEPS.inviteMembers.path as any });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create organization");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const emails = inviteEmails
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean);

      await callOnboardingApi("step/invite-members", { emails });
      toast.success("Onboarding complete!");
      navigate({ to: AUTH_REDIRECTS.afterLogin as any, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete step");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = async () => {
    setIsLoading(true);
    try {
      await callOnboardingApi("skip-step/invite-members", {});
      toast.success("Onboarding complete!");
      navigate({ to: AUTH_REDIRECTS.afterLogin as any, replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to skip step");
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthChecking || isRedirecting || !currentStep) {
    return <FullPageLoading />;
  }

  const stepConfig = (STEPS as any)[currentStep];
  const stepIndex = STEP_ORDER.indexOf(currentStep as any);

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
        <div className="flex justify-center gap-2 mb-4">
          {STEP_ORDER.map((s, index) => (
            <div
              key={s}
              className={`h-2 w-8 rounded-full transition-colors ${
                index <= stepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{stepConfig?.title}</h1>
          <p className="text-sm text-muted-foreground">{stepConfig?.description}</p>
        </div>

        {currentStep === "createOrganization" && (
          <form onSubmit={handleOrganizationSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                id="organizationName"
                placeholder="Enter your organization name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Organization"}
            </Button>
          </form>
        )}

        {currentStep === "inviteMembers" && (
          <div className="space-y-4">
            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteEmails">Invite Emails (comma separated)</Label>
                <Input
                  id="inviteEmails"
                  placeholder="a@company.com, b@company.com"
                  value={inviteEmails}
                  onChange={(e) => setInviteEmails(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Invites & Finish"}
              </Button>
            </form>
            <Button variant="outline" className="w-full" onClick={handleSkip} disabled={isLoading}>
              Skip for now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
