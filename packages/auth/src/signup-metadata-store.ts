/**
 * Temporary storage for signup metadata
 *
 * This module provides a Map to pass metadata from hooks.before to databaseHooks.user.create.before
 * since they run in different contexts and can't share data directly.
 *
 * Uses email as key (available in both contexts) and auto-cleans after 5 minutes.
 */

interface SignupMetadataEntry {
    metadata: Record<string, unknown>;
    timestamp: number;
}

export const signupMetadataStore = new Map<string, SignupMetadataEntry>();

// Auto-cleanup every minute to prevent memory leaks
setInterval(() => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [email, entry] of signupMetadataStore.entries()) {
        if (entry.timestamp < fiveMinutesAgo) {
            signupMetadataStore.delete(email);
        }
    }
}, 60 * 1000);
