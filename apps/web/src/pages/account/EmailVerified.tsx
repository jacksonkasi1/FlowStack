// ** import core packages
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { VerificationSuccess } from "@repo/auth-ui";
import { authClient } from "@/lib/auth-client";

export default function EmailVerified() {
  const routerNavigate = useNavigate();
  const navigate = useCallback(
    (path: string) => {
      void routerNavigate(path, { replace: true });
    },
    [routerNavigate],
  );
  return <VerificationSuccess client={authClient} navigate={navigate} />;
}
