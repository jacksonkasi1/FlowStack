/**
 * Onboarding Plugin Error Codes
 */
export const ONBOARDING_ERROR_CODES = {
    /** User is not authenticated */
    UNAUTHORIZED: "UNAUTHORIZED",
    /** Step has already been completed (once: true) */
    STEP_ALREADY_COMPLETED: "STEP_ALREADY_COMPLETED",
    /** Required steps must be completed before completion step */
    COMPLETE_REQUIRED_STEPS_FIRST: "COMPLETE_REQUIRED_STEPS_FIRST",
    /** User has already completed onboarding */
    ONBOARDING_ALREADY_COMPLETED: "ONBOARDING_ALREADY_COMPLETED",
    /** Step not found in configuration */
    STEP_NOT_FOUND: "STEP_NOT_FOUND",
    /** Internal server error */
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type OnboardingErrorCode = keyof typeof ONBOARDING_ERROR_CODES;
