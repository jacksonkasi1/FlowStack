// ** import types
import { useState } from "react";

// ** import rest-api
import { getUploadUrl } from "@/rest-api/storage";

export function useAvatarUpload() {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const uploadAvatar = async (file: File): Promise<string> => {
        setUploading(true);
        setError(null);

        try {
            // Validate file type
            if (!file.type.startsWith("image/")) {
                throw new Error("Please upload an image file");
            }

            // Validate file size (max 5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error("Image size must be less than 5MB");
            }

            // Get signed upload URL from backend
            const { uploadUrl, publicUrl } = await getUploadUrl({
                fileName: file.name,
                contentType: file.type,
            });

            // Upload file to R2 using signed URL
            const uploadResponse = await fetch(uploadUrl, {
                method: "PUT",
                body: file,
                headers: {
                    "Content-Type": file.type,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error("Failed to upload image");
            }

            setUploading(false);
            return publicUrl;
        } catch (err) {
            const errorMessage =
                err instanceof Error ? err.message : "Failed to upload avatar";
            setError(errorMessage);
            setUploading(false);
            throw new Error(errorMessage);
        }
    };

    return {
        uploadAvatar,
        uploading,
        error,
    };
}
