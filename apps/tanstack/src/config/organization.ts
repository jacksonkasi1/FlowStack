/**
 * Organization Configuration
 *
 * This file contains utilities for the AuthUIProvider organization settings.
 * Core handlers are imported from @repo/config for reusability.
 */

// ** import config
import {
  getUIUserFields,
  ORGANIZATION_LOGO,
  createImageUploadHandler,
  createImageDeleteHandler,
  requiresOrganization
} from '@repo/config'

// ** import types
import type { GetUploadUrlFn, DeleteFileFn } from '@repo/config'

/**
 * Organization enforcement settings
 *
 * Controls whether users must belong to an organization to use the product.
 * This should match the backend config in packages/auth/src/config/organization.ts
 */
export const ORGANIZATION_CONFIG = {
  /**
   * If true, users MUST belong to an organization to use the product.
   * Calculated from centralized AUTH_MODE_CONFIG.
   */
  requireOrganization: requiresOrganization(),
} as const;

/**
 * Create logo upload handler using shared implementation
 */
export const createLogoUploadHandler = (getUploadUrl: GetUploadUrlFn) =>
  createImageUploadHandler(getUploadUrl)

/**
 * Create logo delete handler using shared implementation
 */
export const createLogoDeleteHandler = (deleteFile: DeleteFileFn) =>
  createImageDeleteHandler(deleteFile)

/**
 * Get configuration for AuthUIProvider
 *
 * Combines user metadata fields and organization settings from @repo/config.
 */
export const getOrganizationProviderConfig = (options?: {
  logoUpload?: (file: File) => Promise<string>
  logoDelete?: (filePath: string) => Promise<void>
  /** Disable organization features (for onboarding page) */
  disableOrganization?: boolean
}) => {
  // Get additional fields from shared config
  const additionalFields = getUIUserFields()

  // Add name field (always required for sign-up)
  const allFields: Record<string, {
    label: string
    placeholder?: string
    description?: string
    required?: boolean
    type: 'string'
  }> = {
    name: {
      label: 'Name',
      placeholder: 'Enter your name',
      required: true,
      type: 'string',
    },
    ...additionalFields,
  }

  // Skip organization config if disabled
  if (options?.disableOrganization) {
    return {
      additionalFields: allFields,
      signUp: {
        fields: Object.keys(allFields),
      },
    }
  }

  return {
    additionalFields: allFields,
    signUp: {
      fields: Object.keys(allFields),
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
  }
}
