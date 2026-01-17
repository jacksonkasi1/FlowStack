// ** import config
import axiosInstance from "@/config/axios";

// ** import types
export interface DeleteFileParams {
    filePath?: string;
    publicUrl?: string;
}

export interface DeleteFileResponse {
    success: boolean;
}

/**
 * Delete a file from R2 storage
 *
 * @param params - Delete parameters with either filePath or publicUrl
 * @returns Promise with success response
 */
export const deleteFile = async (
    params: DeleteFileParams,
): Promise<DeleteFileResponse> => {
    let filePath = params.filePath;

    // Extract file path from public URL if provided
    if (!filePath && params.publicUrl) {
        try {
            const url = new URL(params.publicUrl);
            filePath = url.pathname.substring(1); // Remove leading slash
        } catch (error) {
            throw new Error("Invalid public URL provided");
        }
    }

    if (!filePath) {
        throw new Error("Either filePath or publicUrl must be provided");
    }

    const queryParams = new URLSearchParams({
        filePath,
    });

    const response = await axiosInstance.delete<DeleteFileResponse>(
        `/api/storage/delete?${queryParams.toString()}`,
    );

    return response.data;
};
