/**
 * Organization Configuration
 *
 * This file contains utilities for the AuthUIProvider organization settings.
 * For configurable options, see @repo/shared.
 */

// ** import types
import type { GetUploadUrlResponse } from "@/rest-api/storage/get-upload-url";
import type { DeleteFileResponse } from "@/rest-api/storage/delete-file";

// ** import shared config
import {
  getUIUserFields,
  ORGANIZATION_LOGO,
} from "@repo/shared";

/**
 * Create a logo upload handler for the AuthUIProvider
 */
export const createLogoUploadHandler = (
  getUploadUrl: (params: {
    fileName: string;
    contentType?: string;
  }) => Promise<GetUploadUrlResponse>,
) => {
  return async (file: File): Promise<string> => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      throw new Error("Please upload an image file");
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error("Image size must be less than 5MB");
    }

    const { signedUrl, publicUrl } = await getUploadUrl({
      fileName: file.name,
      contentType: file.type,
    });

    const uploadResponse = await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload organization logo");
    }

    return publicUrl;
  };
};

/**
 * Create a logo delete handler for the AuthUIProvider
 */
export const createLogoDeleteHandler = (
  deleteFile: (params: { publicUrl: string }) => Promise<DeleteFileResponse>,
) => {
  return async (logoUrl: string): Promise<void> => {
    await deleteFile({ publicUrl: logoUrl });
  };
};

/**
 * Get configuration for AuthUIProvider
 *
 * Combines user metadata fields and organization settings from @repo/shared.
 */
export const getOrganizationProviderConfig = (options?: {
  logoUpload?: (file: File) => Promise<string>;
  logoDelete?: (filePath: string) => Promise<void>;
}) => {
  // Get additional fields from shared config
  const additionalFields = getUIUserFields();

  // Add name field (always required for sign-up)
  const allFields: Record<string, {
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
    ...additionalFields,
  };

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
  };
};
