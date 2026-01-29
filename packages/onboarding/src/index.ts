/**
 * @repo/onboarding - Better Auth Onboarding Plugin
 *
 * A multi-step onboarding plugin for Better Auth that enforces
 * completion before dashboard access.
 */

// ** import types
import type { BetterAuthPlugin } from "better-auth";
import type { OnboardingOptions, OnboardingStep, StepCompletionResponse, OnboardingStatusResponse } from "./types";

// ** import lib
import { mergeSchema } from "better-auth/db";
import {
    createAuthEndpoint,
    createAuthMiddleware,
    APIError,
    sessionMiddleware,
    type AuthEndpoint as _AuthEndpoint,
} from "better-auth/api";

// ** import utils
import { schema } from "./schema";
import { ONBOARDING_ERROR_CODES } from "./error-codes";
import { transformPath, transformClientPath, getOrderedSteps, getNextStep, getFirstIncompleteStep } from "./utils";
import { getOnboardingAdapter } from "./adapter";

/**
 * Create the onboarding plugin with multi-step wizard support
 */
export const onboarding = <
    Steps extends Record<string, OnboardingStep<any, any, any>>,
    CompletionStep extends keyof Steps,
>(
    options: OnboardingOptions<Steps, CompletionStep>,
) => {
    const opts = {
        autoEnableOnSignUp: true,
        onboardingPath: "/onboarding",
        ...options,
    };

    // Get ordered steps
    const orderedSteps = getOrderedSteps(options.steps);
    const stepOrder = orderedSteps.map(([id]) => id);
    const requiredSteps = orderedSteps.filter(([, step]) => step.required);

    // Build step endpoints
    const stepEndpoints = Object.fromEntries(
        orderedSteps.flatMap(([id, step]) => {
            const isCompletionStep = options.completionStep === id;
            const key = transformPath(id);
            const path = transformClientPath(id);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const endpoints: Record<string, any> = {
                // POST /onboarding/step/{step-name} - Complete a step
                [`onboardingStep${key}`]: createAuthEndpoint(
                    `/onboarding/step/${path}`,
                    {
                        method: "POST",
                        body: step.input,
                        use: [sessionMiddleware],
                        requireHeaders: step.requireHeaders,
                        requireRequest: step.requireRequest,
                        cloneRequest: step.cloneRequest,
                    },
                    async (ctx): Promise<StepCompletionResponse> => {
                        const adapter = getOnboardingAdapter(options, ctx);
                        const session = ctx.context.session;

                        if (!session) {
                            throw new APIError("UNAUTHORIZED", {
                                message: ONBOARDING_ERROR_CODES.UNAUTHORIZED,
                            });
                        }

                        const userId = session.user.id;
                        const completedSteps = await adapter.getCompletedSteps(userId);

                        // Check if step already completed (once: true)
                        if (step.once !== false && completedSteps.has(id)) {
                            throw new APIError("FORBIDDEN", {
                                message: ONBOARDING_ERROR_CODES.STEP_ALREADY_COMPLETED,
                            });
                        }

                        // For completion step, check all required steps are done
                        if (isCompletionStep) {
                            const incompleteRequired = requiredSteps
                                .filter(([key]) => key !== id)
                                .some(([key]) => !completedSteps.has(key));

                            if (incompleteRequired) {
                                throw new APIError("FORBIDDEN", {
                                    message: ONBOARDING_ERROR_CODES.COMPLETE_REQUIRED_STEPS_FIRST,
                                });
                            }
                        }

                        // Execute the step handler
                        const result = await step.handler(ctx);

                        // Update completed steps
                        const updatedCompletedSteps = [...completedSteps, id];
                        const nextStep = getNextStep(stepOrder, id);

                        const update: Record<string, any> = {
                            completedOnboardingSteps: updatedCompletedSteps,
                            currentOnboardingStep: nextStep,
                        };

                        // If this is the completion step, mark onboarding as done
                        if (isCompletionStep) {
                            update.shouldOnboard = false;
                            update.currentOnboardingStep = null;
                        }

                        await adapter.updateOnboardingState(userId, update);

                        return {
                            completedSteps: updatedCompletedSteps,
                            currentStep: isCompletionStep ? null : nextStep,
                            data: result,
                        };
                    },
                ),

                // GET /onboarding/can-access-step/{step-name} - Check if step is accessible
                [`canAccessOnboardingStep${key}`]: createAuthEndpoint(
                    `/onboarding/can-access-step/${path}`,
                    {
                        method: "GET",
                        use: [sessionMiddleware],
                        metadata: { SERVER_ONLY: true },
                    },
                    async (ctx): Promise<boolean> => {
                        const session = ctx.context.session;
                        if (!session) {
                            throw new APIError("UNAUTHORIZED", {
                                message: ONBOARDING_ERROR_CODES.UNAUTHORIZED,
                            });
                        }

                        const adapter = getOnboardingAdapter(options, ctx);
                        const completedSteps = await adapter.getCompletedSteps(session.user.id);

                        // Cannot access if already completed (once: true)
                        if (step.once !== false && completedSteps.has(id)) {
                            throw new APIError("FORBIDDEN", {
                                message: ONBOARDING_ERROR_CODES.STEP_ALREADY_COMPLETED,
                            });
                        }

                        return true;
                    },
                ),
            };

            // Add skip endpoint for non-required steps
            if (!step.required) {
                endpoints[`skipOnboardingStep${key}`] = createAuthEndpoint(
                    `/onboarding/skip-step/${path}`,
                    {
                        method: "POST",
                        use: [sessionMiddleware],
                    },
                    async (ctx): Promise<StepCompletionResponse> => {
                        const session = ctx.context.session;
                        if (!session) {
                            throw new APIError("UNAUTHORIZED", {
                                message: ONBOARDING_ERROR_CODES.UNAUTHORIZED,
                            });
                        }

                        const adapter = getOnboardingAdapter(options, ctx);
                        const userId = session.user.id;
                        const completedSteps = await adapter.getCompletedSteps(userId);

                        // Check if already completed
                        if (completedSteps.has(id)) {
                            throw new APIError("FORBIDDEN", {
                                message: ONBOARDING_ERROR_CODES.STEP_ALREADY_COMPLETED,
                            });
                        }

                        // For completion step skip, check required steps are done
                        if (isCompletionStep) {
                            const incompleteRequired = requiredSteps
                                .filter(([key]) => key !== id)
                                .some(([key]) => !completedSteps.has(key));

                            if (incompleteRequired) {
                                throw new APIError("FORBIDDEN", {
                                    message: ONBOARDING_ERROR_CODES.COMPLETE_REQUIRED_STEPS_FIRST,
                                });
                            }
                        }

                        // Mark as completed (skipped)
                        const updatedCompletedSteps = [...completedSteps, id];
                        const nextStep = getNextStep(stepOrder, id);

                        const update: Record<string, any> = {
                            completedOnboardingSteps: updatedCompletedSteps,
                            currentOnboardingStep: nextStep,
                        };

                        if (isCompletionStep) {
                            update.shouldOnboard = false;
                            update.currentOnboardingStep = null;
                        }

                        await adapter.updateOnboardingState(userId, update);

                        return {
                            completedSteps: updatedCompletedSteps,
                            currentStep: isCompletionStep ? null : nextStep,
                            data: null,
                        };
                    },
                );
            }

            return Object.entries(endpoints);
        }),
    );

    return {
        id: "onboarding",

        endpoints: {
            // GET /onboarding/status - Get full onboarding status
            onboardingStatus: createAuthEndpoint(
                "/onboarding/status",
                {
                    method: "GET",
                    use: [sessionMiddleware],
                },
                async (ctx): Promise<OnboardingStatusResponse> => {
                    const session = ctx.context.session;
                    if (!session) {
                        throw new APIError("UNAUTHORIZED", {
                            message: ONBOARDING_ERROR_CODES.UNAUTHORIZED,
                        });
                    }

                    const adapter = getOnboardingAdapter(options, ctx);
                    const userId = session.user.id;

                    const [shouldOnboard, currentStep, completedSteps] = await Promise.all([
                        adapter.getShouldOnboard(userId),
                        adapter.getCurrentStep(userId),
                        adapter.getCompletedSteps(userId),
                    ]);

                    // Calculate current step if not set
                    const effectiveCurrentStep = currentStep ?? getFirstIncompleteStep(stepOrder, completedSteps);

                    return {
                        shouldOnboard,
                        currentStep: effectiveCurrentStep,
                        completedSteps: [...completedSteps],
                        stepOrder,
                    };
                },
            ),

            // GET /onboarding/should-onboard - Simple check if onboarding is needed
            shouldOnboard: createAuthEndpoint(
                "/onboarding/should-onboard",
                {
                    method: "GET",
                    use: [sessionMiddleware],
                },
                async (ctx): Promise<boolean> => {
                    const session = ctx.context.session;
                    if (!session) {
                        return false;
                    }

                    const adapter = getOnboardingAdapter(options, ctx);
                    return adapter.getShouldOnboard(session.user.id);
                },
            ),

            ...stepEndpoints,
        },

        hooks: {
            after: [
                // After get-session: add onboarding info to session context (but don't replace response)
                // NOTE: Client should call /onboarding/status separately to get onboarding state
                {
                    matcher(context) {
                        return context.path === "/get-session";
                    },
                    handler: createAuthMiddleware(async (_ctx) => {
                        // Don't modify the session response - let client check /onboarding/status
                        // Returning ctx.json() here would REPLACE the session response, breaking auth
                        return null;
                    }),
                },

                // After sign-up: set shouldOnboard to true
                {
                    matcher(context) {
                        return Boolean(opts.autoEnableOnSignUp && context.path?.startsWith("/sign-up"));
                    },
                    handler: createAuthMiddleware(async (ctx) => {
                        const newSession = ctx.context.newSession;

                        if (!newSession) {
                            return;
                        }

                        const enabled =
                            typeof opts.autoEnableOnSignUp === "function"
                                ? await opts.autoEnableOnSignUp(ctx)
                                : opts.autoEnableOnSignUp;

                        if (!enabled) {
                            return;
                        }

                        const adapter = getOnboardingAdapter(options, ctx);
                        const firstStep = stepOrder[0] ?? null;

                        await adapter.updateOnboardingState(newSession.user.id, {
                            shouldOnboard: true,
                            currentOnboardingStep: firstStep,
                            completedOnboardingSteps: [],
                        });

                        return ctx.json({
                            onboardingRedirect: true,
                            currentStep: firstStep,
                            onboardingPath: opts.onboardingPath,
                        });
                    }),
                },
            ],
        },

        rateLimit: [
            {
                pathMatcher(path) {
                    return path.startsWith("/onboarding/");
                },
                window: 10,
                max: 10,
            },
        ],

        schema: !options.secondaryStorage ? mergeSchema(schema, undefined) : undefined,

        $ERROR_CODES: ONBOARDING_ERROR_CODES,

        $Infer: {
            OnboardingSteps: {} as Steps,
            OnboardingCompletionStep: {} as CompletionStep,
            StepOrder: {} as typeof stepOrder,
        },
    } satisfies BetterAuthPlugin;
};

/**
 * Create a typed onboarding step
 */
export const createOnboardingStep = <
    Schema extends Record<string, any> | undefined | null,
    Result = unknown,
    Required extends boolean = false,
>(
    def: Omit<OnboardingStep<Schema, Result, Required>, "required"> &
        (Required extends true ? { required: true } : { required?: Required }),
): OnboardingStep<Schema, Result, Required> => {
    return {
        once: true,
        required: (def.required ?? false) as Required,
        order: 0,
        ...def,
    } as OnboardingStep<Schema, Result, Required>;
};

// ** Re-exports
export * from "./types";
export * from "./error-codes";
export { onboardingClient } from "./client";
