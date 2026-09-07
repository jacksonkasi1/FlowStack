/**
 * Shared settings page configuration for minimal card styling.
 * Used by both web and tanstack apps to ensure consistent styling.
 */
export const minimalCardStyles = {
  cards: "gap-3",
  card: {
    base: "shadow-none border-border/40 gap-3",
    title: "text-base",
    content: "py-3",
    footer: "py-3",
  },
} as const;

export type MinimalCardStyles = typeof minimalCardStyles;
