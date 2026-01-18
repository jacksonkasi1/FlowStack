// ** import lib
import { authClient } from "@/lib/auth-client";

interface CompleteStepData {
    organizationName: string;
}

interface CompleteStepResponse {
    success: boolean;
    data?: {
        organizationId: string;
        organizationName: string;
        slug: string;
    };
}

/**
 * Complete the createOrganization onboarding step
 *
 * Uses the official onboarding client method
 * @param data - The organization data
 * @returns Promise with completion result
 */
export async function completeOnboardingStep(
    stepId: string,
    data: CompleteStepData
): Promise<CompleteStepResponse> {
    try {
        // The onboarding plugin creates step methods dynamically
        // For "createOrganization" step, it creates authClient.onboarding.step.createOrganization()
        const stepMethod = (authClient as any).onboarding?.step?.[stepId];

        if (typeof stepMethod === "function") {
            const result = await stepMethod(data);
            if (result.error) {
                throw new Error(result.error.message || "Failed to complete onboarding step");
            }
            return { success: true, data: result.data };
        }

        // Fallback to direct API call if client method not available
        const { APP_URLS } = await import("@/config/urls");
        const response = await fetch(`${APP_URLS.api}/api/auth/onboarding/step/${stepId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Failed to complete onboarding step");
        }

        return { success: true, data: await response.json() };
    } catch (error) {
        console.error("Error completing onboarding step:", error);
        throw error;
    }
}
