// ** import lib
import { deleteFile } from "./delete-file";

/**
 * Delete an avatar image from R2 storage
 *
 * @param url - The public URL of the avatar to delete
 */
export const deleteAvatar = async (url: string): Promise<void> => {
    await deleteFile({ publicUrl: url });
};
