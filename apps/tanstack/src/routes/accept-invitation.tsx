// ** import lib
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { SignedIn, SignedOut, AcceptInvitationCard } from "@daveyplate/better-auth-ui";
import { Mail, LogIn, UserPlus } from "lucide-react";

// ** import components
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/accept-invitation")({
    component: AcceptInvitationPage,
    validateSearch: (search: Record<string, unknown>) => {
        return {
            invitationId: search.invitationId as string | undefined,
        };
    },
});

function AcceptInvitationPage() {
    const navigate = useNavigate();
    const { invitationId } = Route.useSearch();

    // Build redirect URL to preserve invitation context after auth
    const currentUrl = `/accept-invitation?invitationId=${invitationId}`;

    const handleSignIn = () => {
        // Use type assertion to work with dynamic routes
        navigate({
            to: "/auth/$authView" as const,
            params: { authView: "sign-in" },
            search: { redirectTo: currentUrl } as Record<string, unknown>,
        });
    };

    const handleSignUp = () => {
        navigate({
            to: "/auth/$authView" as const,
            params: { authView: "sign-up" },
            search: { redirectTo: currentUrl } as Record<string, unknown>,
        });
    };

    // No invitation ID - show error state
    if (!invitationId) {
        return (
            <main className="flex min-h-screen items-center justify-center p-4">
                <div className="w-full max-w-sm rounded-lg border bg-card p-6 text-center shadow-sm">
                    <h2 className="text-lg font-semibold">Invalid Invitation</h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        This invitation link appears to be invalid or expired.
                    </p>
                    <Button
                        variant="outline"
                        onClick={() => navigate({ to: "/" })}
                        className="mt-4"
                    >
                        Go Home
                    </Button>
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-4">
            {/* Authenticated: Show accept invitation card */}
            <SignedIn>
                <AcceptInvitationCard />
            </SignedIn>

            {/* Unauthenticated: Show sign in / sign up prompt */}
            <SignedOut>
                <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-sm">
                    <div className="flex flex-col items-center text-center">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                            <Mail className="h-6 w-6 text-primary" />
                        </div>
                        <h2 className="text-lg font-semibold md:text-xl">
                            You've Been Invited!
                        </h2>
                        <p className="mt-2 text-xs text-muted-foreground md:text-sm">
                            Sign in or create an account to accept this organization invitation.
                        </p>
                    </div>
                    <div className="mt-6 flex flex-col gap-3">
                        <Button onClick={handleSignIn} className="w-full">
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In
                        </Button>
                        <Button variant="outline" onClick={handleSignUp} className="w-full">
                            <UserPlus className="mr-2 h-4 w-4" />
                            Create Account
                        </Button>
                    </div>
                </div>
            </SignedOut>
        </main>
    );
}
