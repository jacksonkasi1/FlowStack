// ** import lib
import { useParams, useSearchParams } from "react-router-dom";
import { AuthView } from "@daveyplate/better-auth-ui";
import { AuthShell, authViewClassNames } from "@repo/auth-ui";

// ** import config
import { AUTH_REDIRECTS } from "@/config/redirects";

export default function AuthPage() {
  const { pathname } = useParams();
  const [searchParams] = useSearchParams();

  // Check for redirectTo in query params (e.g., from invitation flow)
  const redirectToParam = searchParams.get("redirectTo");
  const redirectTo =
    redirectToParam?.startsWith("/") && !redirectToParam.startsWith("//")
      ? redirectToParam
      : AUTH_REDIRECTS.afterLogin;

  return (
    <AuthShell
      stage={
        pathname === "sign-up"
          ? "sign-up"
          : pathname?.includes("password")
            ? "reset"
            : "sign-in"
      }
    >
      <AuthView
        pathname={pathname}
        redirectTo={redirectTo}
        classNames={authViewClassNames}
      />
    </AuthShell>
  );
}
