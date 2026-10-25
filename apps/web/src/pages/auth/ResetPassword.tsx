// ** import lib
import { AuthView } from "@daveyplate/better-auth-ui";
import { AuthShell, authViewClassNames } from "@repo/auth-ui";

export default function ResetPassword() {
  return (
    <AuthShell stage="reset">
      <AuthView
        view="RESET_PASSWORD"
        redirectTo="/auth/sign-in"
        classNames={authViewClassNames}
      />
    </AuthShell>
  );
}
