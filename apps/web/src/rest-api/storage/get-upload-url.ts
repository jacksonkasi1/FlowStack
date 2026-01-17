// ** import config
import axiosInstance from "@/config/axios";

// ** import types
export interface GetUploadUrlParams {
    fileName: string;
    contentType?: string;
    organizationId?: string;
}

export interface GetUploadUrlResponse {
    signedUrl: string;
    filePath: string;
    publicUrl: string;
}

/**
 * Get a signed upload URL for uploading files to R2 storage
 *
 * @param params - Upload parameters including fileName and optional contentType
 * @returns Promise with upload URL and public URL
 */
export const getUploadUrl = async (
    params: GetUploadUrlParams,
): Promise<GetUploadUrlResponse> => {
    const queryParams = new URLSearchParams({
        fileName: params.fileName,
        ...(params.contentType && { contentType: params.contentType }),
        ...(params.organizationId && { organizationId: params.organizationId }),
    });

    const response = await axiosInstance.get<GetUploadUrlResponse>(
        `/api/storage/upload-url?${queryParams.toString()}`,
    );

    return response.data;
};
