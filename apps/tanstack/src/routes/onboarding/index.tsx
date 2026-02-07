// ** import lib
import { createFileRoute } from "@tanstack/react-router";

// ** import pages
import OnboardingPage from "./onboarding-page";

export const Route = createFileRoute("/onboarding/")({
  component: () => <OnboardingPage />,
});

