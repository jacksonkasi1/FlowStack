/**
 * @repo/onboarding - Client Plugin
 *
 * Client-side plugin for Better Auth that handles onboarding redirects
 */

// ** import types
import type { BetterAuthClientPlugin } from "better-auth";
import type { onboarding, OnboardingStep } from ".";

// ** import utils
import { toPath } from "./utils";

type InferSteps<T> = T extends {
    $Infer: {
        OnboardingSteps: infer Steps extends Record<string, OnboardingStep<any, any, any>>;
    };
}
    ? Steps
    : T extends Record<string, OnboardingStep<any, any, any>>
    ? T
    : never;

export interface OnboardingClientOptions {
    /**
     * Callback function to handle onboarding redirect
     * Called when user needs to complete onboarding
     */
    onOnboardingRedirect?: (data: {
        currentStep: string | null;
        onboardingPath: string;
    }) => void | Promise<void>;
}

/**
 * Create the onboarding client plugin
 */
export const onboardingClient = <
    Steps extends {
        $Infer: {
            OnboardingSteps: Record<string, OnboardingStep<any, any, any>>;
            OnboardingCompletionStep: string;
        };
    },
>(
    options?: OnboardingClientOptions,
) => {
    return {
        id: "onboarding",

        $InferServerPlugin: {} as ReturnType<
            typeof onboarding<InferSteps<Steps>, Steps["$Infer"]["OnboardingCompletionStep"]>
        >,

        // Refresh session atom when onboarding endpoints are called
        atomListeners: [
            {
                matcher: (path: string) => path.startsWith("/onboarding/"),
                signal: "$sessionSignal",
            },
        ],

        fetchPlugins: [
            {
                id: "onboarding",
                name: "onboarding",
                hooks: {
                    /**
                     * Handle successful responses that indicate onboarding redirect
                     */
                    async onSuccess(context: { data?: { onboardingRedirect?: boolean; currentStep?: string; onboardingPath?: string } }) {
                        if (context.data?.onboardingRedirect && options?.onOnboardingRedirect) {
                            await options.onOnboardingRedirect({
                                currentStep: context.data.currentStep ?? null,
                                onboardingPath: context.data.onboardingPath ?? "/onboarding",
                            });
                        }
                    },

                    /**
                     * Ensure POST method for step/skip endpoints
                     */
                    onRequest(context) {
                        const urlPath = toPath(String(context.url));
                        const basePathRaw = toPath(context.baseURL ?? "/api/auth");
                        const basePath = basePathRaw.endsWith("/") ? basePathRaw.slice(0, -1) : basePathRaw;

                        if (
                            urlPath.startsWith(`${basePath}/onboarding/step/`) ||
                            urlPath.startsWith(`${basePath}/onboarding/skip-step/`)
                        ) {
                            return {
                                ...context,
                                method: "POST",
                            };
                        }
                    },
                },
            },
        ],
    } satisfies BetterAuthClientPlugin;
};
