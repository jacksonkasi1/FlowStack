/**
 * Onboarding Plugin Utilities
 */

/**
 * Transform step ID to PascalCase path format
 * e.g., "createOrganization" -> "CreateOrganization"
 */
export function transformPath(stepId: string): string {
    return stepId.charAt(0).toUpperCase() + stepId.slice(1);
}

/**
 * Transform step ID to kebab-case URL path
 * e.g., "createOrganization" -> "create-organization"
 */
export function transformClientPath(stepId: string): string {
    return stepId.replace(/([A-Z])/g, "-$1").toLowerCase().replace(/^-/, "");
}

/**
 * Extract path from URL
 */
export function toPath(url: string): string {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

/**
 * Get ordered steps based on order property
 */
export function getOrderedSteps<T extends { order?: number }>(
    steps: Record<string, T>,
): [string, T][] {
    return Object.entries(steps).sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
}

/**
 * Get the next step ID after a given step
 */
export function getNextStep(
    stepOrder: string[],
    currentStep: string | null,
): string | null {
    if (!currentStep) {
        return stepOrder[0] ?? null;
    }
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex === stepOrder.length - 1) {
        return null;
    }
    return stepOrder[currentIndex + 1];
}

/**
 * Get the first incomplete step
 */
export function getFirstIncompleteStep(
    stepOrder: string[],
    completedSteps: Set<string>,
): string | null {
    for (const step of stepOrder) {
        if (!completedSteps.has(step)) {
            return step;
        }
    }
    return null;
}
