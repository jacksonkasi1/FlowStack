/**
 * Storage Handlers
 *
 * Reusable upload/delete handlers for images (avatar, organization logo, etc.)
 * These are framework-agnostic and work with any upload URL provider.
 *
 * Usage in apps:
 * ```typescript
 * import { createImageUploadHandler, createImageDeleteHandler } from '@repo/config'
 *
 * const uploadHandler = createImageUploadHandler(getUploadUrl)
 * const deleteHandler = createImageDeleteHandler(deleteFile)
 * ```
 */

// ** import types
export interface GetUploadUrlParams {
    fileName: string
    contentType?: string
}

export interface GetUploadUrlResponse {
    signedUrl: string
    filePath: string
    publicUrl: string
}

export interface DeleteFileParams {
    publicUrl?: string
    filePath?: string
}

export interface DeleteFileResponse {
    success: boolean
}

export type GetUploadUrlFn = (params: GetUploadUrlParams) => Promise<GetUploadUrlResponse>
export type DeleteFileFn = (params: DeleteFileParams) => Promise<DeleteFileResponse>

/**
 * Create a reusable image upload handler
 *
 * @param getUploadUrl - Function to get signed upload URL from backend
 * @returns Upload handler function that takes a File and returns public URL
 */
export function createImageUploadHandler(getUploadUrl: GetUploadUrlFn) {
    return async (file: File): Promise<string> => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            throw new Error('Please upload an image file')
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024
        if (file.size > maxSize) {
            throw new Error('Image size must be less than 5MB')
        }

        const { signedUrl, publicUrl } = await getUploadUrl({
            fileName: file.name,
            contentType: file.type,
        })

        const uploadResponse = await fetch(signedUrl, {
            method: 'PUT',
            body: file,
            headers: {
                'Content-Type': file.type,
            },
        })

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload image')
        }

        return publicUrl
    }
}

/**
 * Create a reusable image delete handler
 *
 * @param deleteFile - Function to delete file from storage
 * @returns Delete handler function that takes a URL and deletes the file
 */
export function createImageDeleteHandler(deleteFile: DeleteFileFn) {
    return async (url: string): Promise<void> => {
        if (!url) return
        await deleteFile({ publicUrl: url })
    }
}
