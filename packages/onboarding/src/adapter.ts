/**
 * Onboarding Plugin Database Adapter
 *
 * Handles reading and updating onboarding state in the database
 */

// ** import types
import type { GenericEndpointContext } from "better-auth";
import type { OnboardingOptions } from "./types";

export interface OnboardingAdapter {
    getCompletedSteps: (userId: string) => Promise<Set<string>>;
    getCurrentStep: (userId: string) => Promise<string | null>;
    getShouldOnboard: (userId: string) => Promise<boolean>;
    updateOnboardingState: (
        userId: string,
        data: Partial<{
            shouldOnboard: boolean | null;
            currentOnboardingStep: string | null;
            completedOnboardingSteps: string[] | null;
        }>,
    ) => Promise<void>;
}

/**
 * Create an onboarding adapter for the given context
 */
export const getOnboardingAdapter = (
    options: OnboardingOptions<any, any>,
    ctx: GenericEndpointContext,
): OnboardingAdapter => {
    return {
        /**
         * Get the set of completed step IDs for a user
         */
        getCompletedSteps: async (userId: string): Promise<Set<string>> => {
            let completedSteps: string[];

            if (options.secondaryStorage && ctx.context.secondaryStorage) {
                const stored = await ctx.context.secondaryStorage.get(`onboarding:${userId}`);
                completedSteps = JSON.parse(String(stored) ?? "{}").completedOnboardingSteps ?? [];
            } else {
                const user = await ctx.context.adapter.findOne<{
                    completedOnboardingSteps?: string;
                }>({
                    model: "user",
                    where: [{ field: "id", value: userId }],
                    select: ["completedOnboardingSteps"],
                });
                completedSteps = JSON.parse(user?.completedOnboardingSteps ?? "[]");
            }

            return new Set<string>(completedSteps);
        },

        /**
         * Get the current onboarding step for a user
         */
        getCurrentStep: async (userId: string): Promise<string | null> => {
            if (options.secondaryStorage && ctx.context.secondaryStorage) {
                const stored = await ctx.context.secondaryStorage.get(`onboarding:${userId}`);
                return JSON.parse(String(stored) ?? "{}").currentOnboardingStep ?? null;
            }

            const user = await ctx.context.adapter.findOne<{
                currentOnboardingStep?: string;
            }>({
                model: "user",
                where: [{ field: "id", value: userId }],
                select: ["currentOnboardingStep"],
            });

            return user?.currentOnboardingStep ?? null;
        },

        /**
         * Check if user should complete onboarding
         */
        getShouldOnboard: async (userId: string): Promise<boolean> => {
            if (options.secondaryStorage && ctx.context.secondaryStorage) {
                const stored = await ctx.context.secondaryStorage.get(`onboarding:${userId}`);
                return JSON.parse(String(stored) ?? "{}").shouldOnboard ?? false;
            }

            const user = await ctx.context.adapter.findOne<{ shouldOnboard?: boolean }>({
                model: "user",
                where: [{ field: "id", value: userId }],
                select: ["shouldOnboard"],
            });

            return user?.shouldOnboard ?? false;
        },

        /**
         * Update onboarding state for a user
         */
        updateOnboardingState: async (
            userId: string,
            data: Partial<{
                shouldOnboard: boolean | null;
                currentOnboardingStep: string | null;
                completedOnboardingSteps: string[] | null;
            }>,
        ): Promise<void> => {
            if (options.secondaryStorage && ctx.context.secondaryStorage) {
                const currentState = JSON.parse(
                    String(await ctx.context.secondaryStorage.get(`onboarding:${userId}`)) ?? "{}",
                );
                await ctx.context.secondaryStorage.set(`onboarding:${userId}`, {
                    shouldOnboard: false,
                    currentOnboardingStep: null,
                    completedOnboardingSteps: [],
                    ...currentState,
                    ...data,
                });
            } else {
                await ctx.context.internalAdapter.updateUser(userId, {
                    ...data,
                    completedOnboardingSteps: Array.isArray(data.completedOnboardingSteps)
                        ? JSON.stringify(data.completedOnboardingSteps)
                        : data.completedOnboardingSteps,
                });
            }
        },
    };
};
