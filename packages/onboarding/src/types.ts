/**
 * Onboarding Plugin Types
 */

// ** import types
import type { GenericEndpointContext } from "better-auth";
import type { ZodType } from "zod";

/**
 * Step handler context with typed body
 */
export type StepHandlerContext<Schema = unknown> = Omit<GenericEndpointContext, "body"> & {
    body: Schema;
};

/**
 * Step handler function type
 */
export type StepHandler<Schema = unknown, Result = unknown> = (
    ctx: StepHandlerContext<Schema>,
) => Result | Promise<Result>;

/**
 * Onboarding step definition
 */
export interface OnboardingStep<
    Schema extends Record<string, unknown> | undefined | null = undefined,
    Result = unknown,
    Required extends boolean = false,
> {
    /**
     * Optional Zod schema for validating the request body
     */
    input?: ZodType<Schema>;

    /**
     * Handler function executed when completing this step
     */
    handler: StepHandler<Schema, Result>;

    /**
     * If true, this step can only be completed once per user
     * @default true
     */
    once?: boolean;

    /**
     * If true, this step must be completed before onboarding is done
     * @default false
     */
    required?: Required;

    /**
     * Step order in the onboarding flow (lower numbers first)
     * @default 0
     */
    order?: number;

    /**
     * If true, headers will be required in the context
     */
    requireHeaders?: boolean;

    /**
     * If true, request object will be required
     */
    requireRequest?: boolean;

    /**
     * Clone the request object from the router
     */
    cloneRequest?: boolean;
}

/**
 * Onboarding plugin options
 */
export interface OnboardingOptions<
    Steps extends Record<string, OnboardingStep<any, any, any>>,
    CompletionStep extends keyof Steps,
> {
    /**
     * Map of onboarding steps keyed by unique step identifier
     */
    steps: Steps;

    /**
     * The key of the step that, when completed, marks onboarding as finished
     */
    completionStep: CompletionStep;

    /**
     * Whether to automatically enable onboarding for new users during signup
     * @default true
     */
    autoEnableOnSignUp?: boolean | ((ctx: GenericEndpointContext) => boolean | Promise<boolean>);

    /**
     * Whether to use secondary storage instead of database
     * @default false
     */
    secondaryStorage?: boolean;

    /**
     * Redirect URL for onboarding page
     * @default "/onboarding"
     */
    onboardingPath?: string;
}

/**
 * Step completion response
 */
export interface StepCompletionResponse<T = unknown> {
    completedSteps: string[];
    currentStep: string | null;
    data: T;
}

/**
 * Onboarding status response
 */
export interface OnboardingStatusResponse {
    shouldOnboard: boolean;
    currentStep: string | null;
    completedSteps: string[];
    stepOrder: string[];
}

/**
 * Re-export better-fetch types for consumers
 */
export type * from "@better-fetch/fetch";
