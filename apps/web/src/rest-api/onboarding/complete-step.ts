// ** import config
import { APP_URLS } from "@/config/urls";

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
 * Complete an onboarding step
 * 
 * @param stepId - The ID of the step to complete
 * @param data - The data for the step
 * @returns Promise with completion result
 */
export async function completeOnboardingStep(
    stepId: string,
    data: CompleteStepData
): Promise<CompleteStepResponse> {
    const response = await fetch(`${APP_URLS.api}/api/auth/onboarding/complete-step`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ stepId, data }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to complete onboarding step");
    }

    return response.json();
}
