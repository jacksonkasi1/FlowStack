/**
 * Organization Configuration
 * Centralized configuration for organization features
 * Modify this file to customize organization behavior
 */

import type { GetUploadUrlResponse } from "@/rest-api/storage/get-upload-url";
import type { DeleteFileResponse } from "@/rest-api/storage/delete-file";

// ** import shared config
import {
  USER_METADATA_FIELDS,
  getUIUserFields,
  type UserMetadataField,
} from "@repo/shared";

export interface OrganizationLogoConfig {
  size: number;
  extension: string[];
  enabled: boolean;
}

// Re-export for backward compatibility
export type SignUpField = UserMetadataField;

export interface OrganizationRole {
  role: string;
  label: string;
}

export interface OrganizationConfig {
  /** Organization logo settings */
  logo: OrganizationLogoConfig;
  /** Custom roles for organization members */
  customRoles: OrganizationRole[];
  /** Page routes */
  routes: {
    /** Organization settings page path */
    settings: string;
    /** Organization members page path */
    members: string;
    /** Invitation accept page path */
    invitation: string;
  };
  /** Sign-up form additional fields */
  signUpFields: SignUpField[];
  /** Navigation items to show in header */
  navigation: {
    /** Show Team link in header */
    showTeamLink: boolean;
    /** Show Organization link in header */
    showOrganizationLink: boolean;
    /** Show Profile link in header */
    showProfileLink: boolean;
  };
  /** Invite signup settings */
  inviteSignup?: {
    /** Auto-verify email when signing up via invite (default: true) */
    autoVerify?: boolean;
  };
}

export const organizationConfig: OrganizationConfig = {
  logo: {
    size: 256, // Size in pixels (width x height)
    extension: ["png", "jpg", "jpeg", "webp"],
    enabled: true,
  },
  customRoles: [],
  routes: {
    settings: "/organization/settings",
    members: "/organization/members",
    invitation: "/invitation",
  },
  // Use shared user metadata fields for sign-up
  signUpFields: USER_METADATA_FIELDS,
  navigation: {
    showTeamLink: true,
    showOrganizationLink: true,
    showProfileLink: true,
  },
};

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

export const createLogoDeleteHandler = (
  deleteFile: (params: { publicUrl: string }) => Promise<DeleteFileResponse>,
) => {
  return async (logoUrl: string): Promise<void> => {
    await deleteFile({ publicUrl: logoUrl });
  };
};

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
          size: organizationConfig.logo.size,
          extension: organizationConfig.logo.extension[0],
        }
        : undefined,
      customRoles: organizationConfig.customRoles,
    },
  };
};
