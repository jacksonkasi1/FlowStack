// ** import lib
import { useCallback, useEffect, useState } from "react";
import { createAuthClient } from "better-auth/react";
import { organizationClient, adminClient } from "better-auth/client/plugins";
import { onboardingClient } from "@repo/onboarding/client";

type AuthClientWithSession = {
  getSession: (...args: any[]) => Promise<any>;
};

interface UseEmailVerificationStatusOptions {
  authClient?: AuthClientWithSession;
}

interface EmailVerificationStatus {
  user: any | null;
  isVerified: boolean;
  isPending: boolean;
  refetch: () => Promise<void>;
}

/**
 * Read current user's email verification state from session.
 * Useful for custom app logic/UI beyond the built-in guard modes.
 */
export function useEmailVerificationStatus(
  options?: UseEmailVerificationStatusOptions,
): EmailVerificationStatus {
  const [isPending, setIsPending] = useState(true);

  const [user, setUser] = useState<any | null>(null);

  const refetch = useCallback(async () => {
    setIsPending(true);
    try {
      const client =
        options?.authClient ||
        createAuthClient({
          plugins: [
            organizationClient(),
            adminClient() as any,
            onboardingClient(),
          ],
        });

      const result = await client.getSession({
        fetchOptions: { cache: "no-store" },
      });

      setUser(result.data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsPending(false);
    }
  }, [options?.authClient]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    user,
    isVerified: !!user?.emailVerified,
    isPending,
    refetch,
  };
}
