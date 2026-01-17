// ** import lib
import { Navigate } from "react-router-dom";

// ** import components
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome to FlowStack</h2>
            <p className="mt-2 text-gray-600">You are signed in.</p>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
