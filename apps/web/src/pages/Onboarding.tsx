// ** import types
import type { FormEvent } from "react";

// ** import lib
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ** import config
import { AUTH_REDIRECTS } from "@/config/redirects";
import { APP_URLS } from "@/config/urls";

// ** import utils
import { authClient } from "@/lib/auth-client";

interface OnboardingProps {
    step?: "createOrganization" | "inviteMembers";
}

// Step configuration
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

/**
 * Call onboarding API endpoint directly
 */
async function callOnboardingApi(endpoint: string, data?: Record<string, unknown>) {
    const response = await fetch(`${APP_URLS.api}/api/auth/onboarding/${endpoint}`, {
        method: data ? "POST" : "GET",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Request failed" }));
        throw new Error(error.message || `API error: ${response.status}`);
    }

    return response.json();
}

export default function Onboarding({ step }: OnboardingProps) {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthChecking, setIsAuthChecking] = useState(true);
    const [currentStep, setCurrentStep] = useState<string | null>(step || null);
    const [organizationName, setOrganizationName] = useState("");
    const [inviteEmails, setInviteEmails] = useState("");

    // Check auth and fetch onboarding status on mount
    useEffect(() => {
        const checkAuthAndStatus = async () => {
            try {
                // First check if user is authenticated
                const sessionResult = await authClient.getSession();
                const user = sessionResult.data?.user as any;

                if (!user) {
                    navigate("/auth/sign-in", { replace: true });
                    return;
                }

                // Check onboarding status from session
                if (!user.shouldOnboard) {
                    // Onboarding complete, go to dashboard
                    navigate(AUTH_REDIRECTS.afterLogin, { replace: true });
                    return;
                }

                // Determine current step from session or use provided step
                const serverStep = user.currentOnboardingStep || "createOrganization";

                // If no step prop provided, redirect to the correct step based on session
                if (!step) {
                    const stepPath = STEPS[serverStep as keyof typeof STEPS]?.path;
                    if (stepPath) {
                        navigate(stepPath, { replace: true });
                        return;
                    }
                }

                // If step prop doesn't match server step, redirect to server step
                // (unless the user has already completed the provided step)
                if (step && step !== serverStep) {
                    const completedSteps = JSON.parse(user.completedOnboardingSteps || "[]");
                    if (!completedSteps.includes(step)) {
                        // User trying to access a step they shouldn't - redirect to correct step
                        const stepPath = STEPS[serverStep as keyof typeof STEPS]?.path;
                        if (stepPath) {
                            navigate(stepPath, { replace: true });
                            return;
                        }
                    }
                }

                setCurrentStep(step || serverStep);
            } catch (error) {
                console.error("Failed to check auth/onboarding status:", error);
                navigate("/auth/sign-in", { replace: true });
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
            // Call the step endpoint directly
            await callOnboardingApi("step/create-organization", {
                organizationName: organizationName.trim(),
            });

            toast.success("Organization created!");

            // Navigate to next step
            navigate(STEPS.inviteMembers.path);
        } catch (error) {
            console.error("Failed to create organization:", error);
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
                .filter((email) => email);

            // Call the step endpoint directly
            await callOnboardingApi("step/invite-members", { emails });

            toast.success("Onboarding complete!");
            toast.info("Verification email sent. Please check your inbox.");

            // Small delay to ensure session is updated, then navigate
            setTimeout(() => {
                navigate(AUTH_REDIRECTS.afterLogin, { replace: true });
            }, 100);
        } catch (error) {
            console.error("Failed to complete step:", error);
            toast.error(error instanceof Error ? error.message : "Failed to complete step");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = async () => {
        setIsLoading(true);
        try {
            // Call the skip endpoint directly
            await callOnboardingApi("skip-step/invite-members", {});

            toast.success("Onboarding complete!");
            toast.info("Verification email sent. Please check your inbox.");

            // Small delay to ensure session is updated, then navigate
            setTimeout(() => {
                navigate(AUTH_REDIRECTS.afterLogin, { replace: true });
            }, 100);
        } catch (error) {
            console.error("Failed to skip step:", error);
            toast.error(error instanceof Error ? error.message : "Failed to skip step");
        } finally {
            setIsLoading(false);
        }
    };

    // Show loading while checking auth or determining step
    if (isAuthChecking || !currentStep) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4 bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    const stepConfig = STEPS[currentStep as keyof typeof STEPS];
    const stepIndex = STEP_ORDER.indexOf(currentStep as (typeof STEP_ORDER)[number]);

    return (
        <div className="flex min-h-screen items-center justify-center p-4 bg-background">
            <div className="w-full max-w-md space-y-6 rounded-lg border bg-card p-8 shadow-sm">
                {/* Progress indicator */}
                <div className="flex justify-center gap-2 mb-4">
                    {STEP_ORDER.map((s, index) => (
                        <div
                            key={s}
                            className={`h-2 w-8 rounded-full transition-colors ${index <= stepIndex ? "bg-primary" : "bg-muted"
                                }`}
                        />
                    ))}
                </div>

                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold">{stepConfig?.title}</h1>
                    <p className="text-sm text-muted-foreground">{stepConfig?.description}</p>
                </div>

                {/* Step 1: Create Organization */}
                {currentStep === "createOrganization" && (
                    <form onSubmit={handleOrganizationSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="organizationName">Organization Name</Label>
                            <Input
                                id="organizationName"
                                type="text"
                                placeholder="Enter your organization name"
                                value={organizationName}
                                onChange={(e) => setOrganizationName(e.target.value)}
                                disabled={isLoading}
                                required
                                minLength={2}
                                maxLength={100}
                            />
                            <p className="text-sm text-muted-foreground">
                                This will be your workspace name
                            </p>
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "Creating..." : "Create Organization"}
                        </Button>
                    </form>
                )}

                {/* Step 2: Invite Members */}
                {currentStep === "inviteMembers" && (
                    <form onSubmit={handleInviteSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="emails">Team Member Emails</Label>
                            <Input
                                id="emails"
                                type="text"
                                placeholder="email1@example.com, email2@example.com"
                                value={inviteEmails}
                                onChange={(e) => setInviteEmails(e.target.value)}
                                disabled={isLoading}
                            />
                            <p className="text-sm text-muted-foreground">
                                Enter email addresses separated by commas
                            </p>
                        </div>
                        <div className="flex flex-col gap-2">
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? "Sending..." : "Send Invitations"}
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={handleSkip}
                                disabled={isLoading}
                            >
                                Skip for now
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
