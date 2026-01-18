/**
 * Organization Configuration
 * Centralized configuration for organization features
 * Modify this file to customize organization behavior
 */

import type { GetUploadUrlResponse } from "@/rest-api/storage/get-upload-url";
import type { DeleteFileResponse } from "@/rest-api/storage/delete-file";

export interface OrganizationLogoConfig {
  size: number;
  extension: string[];
  enabled: boolean;
}

export interface SignUpField {
  key: string;
  label: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  type?: "string" | "number" | "boolean" | "select";
  options?: { label: string; value: string }[];
}

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
  signUpFields: [
    {
      key: "organizationName",
      label: "Organization Name",
      placeholder: "Enter your organization name",
      description: "This will be your workspace name",
      required: true,
      type: "string",
    },
  ],
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
  type FieldConfig = {
    label: string;
    placeholder?: string;
    description?: string;
    required?: boolean;
    type: "string";
    options?: { label: string; value: string }[];
  };

  const additionalFields: Record<string, FieldConfig> = {};

  // Add name field
  additionalFields.name = {
    label: "Name",
    placeholder: "Enter your name",
    required: true,
    type: "string",
  };

  // Add organization sign-up fields
  for (const field of organizationConfig.signUpFields) {
    additionalFields[field.key] = {
      label: field.label,
      placeholder: field.placeholder,
      description: field.description,
      required: field.required ?? false,
      type: "string",
      ...(field.options && { options: field.options }),
    };
  }

  return {
    additionalFields,
    signUp: {
      fields: Object.keys(additionalFields),
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
