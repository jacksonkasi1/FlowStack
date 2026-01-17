// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// ** import lib
import { OrganizationMembersCard } from "@daveyplate/better-auth-ui";

export default function OrganizationMembersPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-lg py-8 px-4">
          <h1 className="text-xl font-semibold mb-6">Organization Members</h1>
          <OrganizationMembersCard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
