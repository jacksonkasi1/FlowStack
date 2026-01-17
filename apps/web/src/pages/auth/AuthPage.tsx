// ** import lib
import { useParams } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";

export default function AuthPage() {
  const { pathname } = useParams();

  // Use absolute URL to ensure redirect goes to frontend, not server
  const redirectTo = `${window.location.origin}/dashboard`;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthView pathname={pathname} redirectTo={redirectTo} />
    </main>
  );
}
