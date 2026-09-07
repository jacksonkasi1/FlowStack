import { useSearchParams } from "react-router-dom";
import { InvitationFlow } from "@repo/auth-ui";
import { authClient } from "@/lib/auth-client";
export default function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const id = params.get("invitationId");
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      {id ? (
        <InvitationFlow client={authClient} invitationId={id} />
      ) : (
        <p>Invalid invitation link.</p>
      )}
    </main>
  );
}
