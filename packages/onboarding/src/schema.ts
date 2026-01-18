/**
 * Onboarding Plugin Database Schema
 *
 * Extends the user table with onboarding-related fields
 */

// ** import types
import type { BetterAuthPluginDBSchema } from "better-auth/db";

export const schema = {
    user: {
        fields: {
            /**
             * Whether the user needs to complete onboarding
             * Set to true on signup, false after completing all required steps
             */
            shouldOnboard: {
                type: "boolean",
                required: false,
                defaultValue: true,
            },
            /**
             * Current onboarding step the user is on
             * Null if onboarding is complete or not started
             */
            currentOnboardingStep: {
                type: "string",
                required: false,
                input: false,
            },
            /**
             * JSON array of completed step IDs
             * e.g., '["createOrganization", "inviteMembers"]'
             */
            completedOnboardingSteps: {
                type: "string",
                required: false,
                input: false,
            },
        },
    },
} satisfies BetterAuthPluginDBSchema;
