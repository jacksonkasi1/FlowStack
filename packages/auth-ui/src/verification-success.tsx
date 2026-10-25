// ** import core packages
import { useCallback, useEffect, useState } from "react";
import { isOrganizationMode } from "@repo/config";

// ** import components
import { SuccessScreen } from "./success-screen";
import { refreshSession } from "./session-sync";

export function VerificationSuccess({
  client,
  navigate,
}: {
  client: any;
  navigate: (path: string) => void;
}) {
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void (async () => {
      const session = await refreshSession(client);
      if (!session?.user || !session.user.emailVerified) {
        if (active)
          navigate(session?.user ? "/account/verify-email" : "/auth/sign-in");
        return;
      }
      let next = "/auth/sign-in";
      if (session?.user) {
        if (!session.user.emailVerified) {
          next = "/account/verify-email";
        } else {
          const pending = isOrganizationMode()
            ? await client.$fetch("/invitation/pending")
            : null;
          if (pending?.error) throw new Error("Unable to check invitation.");
          next = pending?.data?.invitationId
            ? `/accept-invitation?invitationId=${encodeURIComponent(pending.data.invitationId)}`
            : session.user.shouldOnboard
              ? "/onboarding"
              : "/dashboard";
        }
      }
      if (active) setDestination(next);
    })().catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [client, attempt, navigate]);
  const proceed = useCallback(() => {
    if (destination) navigate(destination);
  }, [destination, navigate]);
  if (error)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <section role="alert" className="text-center">
          <h1 className="text-xl font-semibold">
            We couldn't refresh your account
          </h1>
          <button
            className="mt-4 rounded-md border px-4 py-2"
            onClick={() => {
              setError(false);
              setAttempt((n) => n + 1);
            }}
          >
            Try again
          </button>
        </section>
      </main>
    );
  return (
    <SuccessScreen
      title={
        destination ? "Email verification complete" : "Checking your account"
      }
      message="Checking your account and opening the next step…"
      onContinue={destination ? proceed : undefined}
    />
  );
}
