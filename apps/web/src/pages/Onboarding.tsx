// ** import core packages
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// ** import components
import { OnboardingWizard } from "@repo/auth-ui";

// ** import utils
import { authClient } from "@/lib/auth-client";
import { onboardingApi } from "@/rest-api/onboarding";

export default function Onboarding({
  step,
}: {
  step?: "createOrganization" | "inviteMembers";
}) {
  const routerNavigate = useNavigate();
  const navigate = useCallback(
    (path: string) => {
      void routerNavigate(path, { replace: true });
    },
    [routerNavigate],
  );
  return (
    <OnboardingWizard
      step={step}
      client={authClient}
      api={onboardingApi}
      navigate={navigate}
    />
  );
}
