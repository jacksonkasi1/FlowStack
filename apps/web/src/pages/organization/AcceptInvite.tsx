// ** import components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// ** import lib
import { AcceptInvitationCard } from "@daveyplate/better-auth-ui";

export default function AcceptInvitationPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-md py-8 px-4">
        <h1 className="text-xl font-semibold mb-6 text-center">
          Accept Invitation
        </h1>
        <AcceptInvitationCard />
      </div>
    </ProtectedRoute>
  );
}
