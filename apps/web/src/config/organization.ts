/**
 * Organization Configuration
 * Centralized configuration for organization features
 * Modify this file to customize organization behavior
 */

import type { GetUploadUrlResponse } from "@/rest-api/storage/get-upload-url";
import type { DeleteFileResponse } from "@/rest-api/storage/delete-file";

export interface OrganizationLogoConfig {
  /** Maximum logo size in bytes (default: 256KB) */
  size: number;
  /** Allowed file extensions (default: png, jpg, jpeg, webp) */
  extension: string[];
  /** Whether to enable logo upload */
  enabled: boolean;
}

export interface OrganizationRole {
  /** Role identifier */
  role: string;
  /** Display label */
  label: string;
}

export interface OrganizationConfig {
  /** Organization logo settings */
  logo: OrganizationLogoConfig;
  /** Custom roles (in addition to built-in owner, admin, member) */
  customRoles: OrganizationRole[];
  /** Organization-related routes */
  routes: {
    /** Organization settings page path */
    settings: string;
    /** Organization members page path */
    members: string;
    /** Invitation accept page path */
    invitation: string;
  };
}

/**
 * Default organization configuration
 * Modify this object to customize organization features
 */
export const organizationConfig: OrganizationConfig = {
  logo: {
    size: 256 * 1024, // 256KB
    extension: ["png", "jpg", "jpeg", "webp"],
    enabled: true,
  },
  customRoles: [], // Built-in roles: owner, admin, member
  routes: {
    settings: "/organization/settings",
    members: "/organization/members",
    invitation: "/invitation",
  },
};

/**
 * Logo upload handler factory
 * Creates a logo upload handler with the given getUploadUrl and deleteFile functions
 */
export const createLogoUploadHandler = (
  getUploadUrl: (params: {
    fileName: string;
    contentType?: string;
  }) => Promise<GetUploadUrlResponse>,
  deleteFile: (params: { filePath: string }) => Promise<DeleteFileResponse>,
) => {
  return async (file: File): Promise<string> => {
    const { signedUrl, filePath } = await getUploadUrl({
      fileName: file.name,
      contentType: file.type,
    });

    await fetch(signedUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    return filePath;
  };
};

/**
 * Logo delete handler factory
 * Creates a logo delete handler with the given deleteFile function
 */
export const createLogoDeleteHandler = (
  deleteFile: (params: { filePath: string }) => Promise<DeleteFileResponse>,
) => {
  return async (filePath: string): Promise<void> => {
    await deleteFile({ filePath });
  };
};

/**
 * Get organization configuration for AuthUIProvider
 * Returns the organization prop configuration
 */
export const getOrganizationProviderConfig = (options?: {
  logoUpload?: (file: File) => Promise<string>;
  logoDelete?: (filePath: string) => Promise<void>;
}) => {
  return {
    logo: options?.logoUpload
      ? {
          upload: options.logoUpload,
          delete: options.logoDelete,
          size: organizationConfig.logo.size,
          extension: organizationConfig.logo.extension[0],
        }
      : undefined,
    customRoles: organizationConfig.customRoles,
  };
};
