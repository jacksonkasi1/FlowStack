// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute, RequireOnboarding } from "@repo/auth-ui/guards/react-router";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <RequireOnboarding>
        <AppLayout>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Welcome to FlowStack</h2>
              <p className="mt-2 text-muted-foreground">You are signed in.</p>
            </div>
          </div>
        </AppLayout>
      </RequireOnboarding>
    </ProtectedRoute>
  );
}
