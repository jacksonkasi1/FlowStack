// ** import lib
import { getUploadUrl } from './get-upload-url'

/**
 * Upload an avatar image to R2 storage
 *
 * @param file - The image file to upload
 * @returns Promise with the public URL of the uploaded avatar
 * @throws Error if file validation fails or upload fails
 */
export const uploadAvatar = async (file: File): Promise<string> => {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('Please upload an image file')
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024
  if (file.size > maxSize) {
    throw new Error('Image size must be less than 5MB')
  }

  // Get signed upload URL from backend
  const { signedUrl, publicUrl } = await getUploadUrl({
    fileName: file.name,
    contentType: file.type,
  })

  // Upload file to R2 using signed URL
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
