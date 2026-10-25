import { useSearchParams } from "react-router-dom";
import { AuthShell, InvitationFlow } from "@repo/auth-ui";
import { authClient } from "@/lib/auth-client";
export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const id = params.get("invitationId");
  return (
    <>
      {id ? (
        <InvitationFlow client={authClient} invitationId={id} />
      ) : (
        <AuthShell stage="invitation">
          <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This link is missing its invitation details. Ask your workspace
            owner for a new invitation.
          </p>
          <a href="/auth/sign-in" className="mt-5 inline-block underline">
            Go to sign in
          </a>
        </AuthShell>
      )}
    </>
  );
}
