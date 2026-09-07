// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@repo/auth-ui/guards/react-router";

// ** import lib
import { OrganizationSettingsCards } from "@daveyplate/better-auth-ui";

export default function OrganizationSettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-lg py-8 px-4">
          <h1 className="text-xl font-semibold mb-6">Organization Settings</h1>
          <OrganizationSettingsCards />
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
