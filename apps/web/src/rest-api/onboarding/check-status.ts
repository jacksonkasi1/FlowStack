// ** import lib
import { authClient } from "@/lib/auth-client";

/**
 * Check if the current user needs to complete onboarding
 *
 * Uses the official onboarding client method
 * @returns Promise with shouldOnboard boolean
 */
export async function checkOnboardingStatus(): Promise<{ shouldOnboard: boolean }> {
    try {
        const result = await (authClient as any).onboarding?.shouldOnboard();
        return { shouldOnboard: result?.data?.shouldOnboard ?? false };
    } catch (error) {
        console.error("Error checking onboarding status:", error);
        return { shouldOnboard: false };
    }
}
