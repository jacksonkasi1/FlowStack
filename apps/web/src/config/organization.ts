/**
 * Organization Configuration
 *
 * This file contains utilities for the AuthUIProvider organization settings.
 * Core handlers are imported from @repo/shared for reusability.
 */

// ** import shared config
import {
  ORGANIZATION_LOGO,
  createImageUploadHandler,
  createImageDeleteHandler,
} from "@repo/shared";

// ** import types
import type { GetUploadUrlFn, DeleteFileFn } from "@repo/shared";

/**
 * Organization enforcement settings
 *
 * Controls whether users must belong to an organization to use the product.
 * This should match the backend config in packages/auth/src/config/organization.ts
 */
export const ORGANIZATION_CONFIG = {
  /**
   * If true, users MUST belong to an organization to use the product.
   * Users without an organization will be redirected to onboarding to create one.
   *
   * If false, users can access the product without an organization.
   *
   * @default true
   */
  requireOrganization: true,
} as const;

/**
 * Create logo upload handler using shared implementation
 */
export const createLogoUploadHandler = (getUploadUrl: GetUploadUrlFn) =>
  createImageUploadHandler(getUploadUrl);

/**
 * Create logo delete handler using shared implementation
 */
export const createLogoDeleteHandler = (deleteFile: DeleteFileFn) =>
  createImageDeleteHandler(deleteFile);

/**
 * Get configuration for AuthUIProvider
 *
 * Simplified for the new onboarding flow - signup only requires name.
 * Organization is created during onboarding.
 */
export const getOrganizationProviderConfig = (options?: {
  logoUpload?: (file: File) => Promise<string>;
  logoDelete?: (filePath: string) => Promise<void>;
}) => {
  // Only name field is required for signup
  // Organization details are captured during onboarding
  const additionalFields: Record<string, {
    label: string;
    placeholder?: string;
    description?: string;
    required?: boolean;
    type: "string";
  }> = {
    name: {
      label: "Name",
      placeholder: "Enter your name",
      required: true,
      type: "string",
    },
  };

  return {
    additionalFields,
    signUp: {
      fields: ["name"],
    },
    organization: {
      logo: options?.logoUpload
        ? {
          upload: options.logoUpload,
          size: ORGANIZATION_LOGO.size,
          extension: ORGANIZATION_LOGO.extensions[0],
        }
        : undefined,
    },
  };
};
