// ** import config
import { APP_URLS } from "@/config/urls";

interface ShouldOnboardResponse {
    shouldOnboard: boolean;
}

/**
 * Check if the current user needs to complete onboarding
 * 
 * @returns Promise with shouldOnboard boolean
 */
export async function checkOnboardingStatus(): Promise<ShouldOnboardResponse> {
    const response = await fetch(`${APP_URLS.api}/api/auth/onboarding/should-onboard`, {
        credentials: "include",
    });

    if (!response.ok) {
        throw new Error("Failed to check onboarding status");
    }

    return response.json();
}
