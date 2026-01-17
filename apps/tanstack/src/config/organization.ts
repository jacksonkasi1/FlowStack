/**
 * Organization Configuration
 * Centralized configuration for organization features
 * Modify this file to customize organization behavior
 */

import type { GetUploadUrlResponse } from '@/rest-api/storage/get-upload-url'
import type { DeleteFileResponse } from '@/rest-api/storage/delete-file'

export interface OrganizationLogoConfig {
  size: number
  extension: string[]
  enabled: boolean
}

export interface OrganizationRole {
  role: string
  label: string
}

export interface OrganizationConfig {
  logo: OrganizationLogoConfig
  customRoles: OrganizationRole[]
  routes: {
    settings: string
    members: string
    invitation: string
  }
}

export const organizationConfig: OrganizationConfig = {
  logo: {
    size: 256 * 1024,
    extension: ['png', 'jpg', 'jpeg', 'webp'],
    enabled: true,
  },
  customRoles: [],
  routes: {
    settings: '/organization/settings',
    members: '/organization/members',
    invitation: '/invitation',
  },
}

export const createLogoUploadHandler = (
  getUploadUrl: (params: {
    fileName: string
    contentType?: string
  }) => Promise<GetUploadUrlResponse>,
  deleteFile: (params: { filePath: string }) => Promise<DeleteFileResponse>,
) => {
  return async (file: File): Promise<string> => {
    const { signedUrl, filePath } = await getUploadUrl({
      fileName: file.name,
      contentType: file.type,
    })

    await fetch(signedUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    return filePath
  }
}

export const createLogoDeleteHandler = (
  deleteFile: (params: { filePath: string }) => Promise<DeleteFileResponse>,
) => {
  return async (filePath: string): Promise<void> => {
    await deleteFile({ filePath })
  }
}

export const getOrganizationProviderConfig = (options?: {
  logoUpload?: (file: File) => Promise<string>
  logoDelete?: (filePath: string) => Promise<void>
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
  }
}
