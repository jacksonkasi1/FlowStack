// ** import lib
import { useParams, useSearchParams } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";

// ** import config
import { AUTH_REDIRECTS } from "@/config/redirects";

export default function AuthPage() {
  const { pathname } = useParams();
  const [searchParams] = useSearchParams();

  // Check for redirectTo in query params (e.g., from invitation flow)
  const redirectToParam = searchParams.get("redirectTo");
  const redirectTo = redirectToParam || AUTH_REDIRECTS.afterLogin;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <AuthView pathname={pathname} redirectTo={redirectTo} />
    </main>
  );
}
