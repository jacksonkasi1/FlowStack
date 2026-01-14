// ** import types
export type {
  Env,
  UploadOptions,
  FileObject,
  ListFilesOptions,
  ListFilesResult,
  DownloadResult,
} from "./types";

// ** import utils
export { createEnvFromProcessEnv } from "./types";
export { createR2Client } from "./client";
export { r2GetSignedUploadUrl, r2UploadBuffer } from "./upload";
export { r2GetSignedDownloadUrl, r2DownloadFile } from "./download";
export {
  r2DeleteFile,
  r2DeleteFileByUrl,
  r2DeleteMultipleFiles,
} from "./delete";
export { r2ListFiles, r2FileExists } from "./list";

// ** import core packages
import { createEnvFromProcessEnv } from "./types";
import {
  r2DeleteFile,
  r2DeleteFileByUrl,
  r2DeleteMultipleFiles,
} from "./delete";
import { r2DownloadFile, r2GetSignedDownloadUrl } from "./download";
import { r2FileExists, r2ListFiles } from "./list";
import { r2GetSignedUploadUrl, r2UploadBuffer } from "./upload";

export const r2 = {
  getSignedUploadUrl: (
    fileName: string,
    options?: Parameters<typeof r2GetSignedUploadUrl>[2],
  ) => r2GetSignedUploadUrl(fileName, createEnvFromProcessEnv(), options),

  uploadBuffer: (
    buffer: Buffer | Uint8Array,
    fileName: string,
    options?: Parameters<typeof r2UploadBuffer>[3],
  ) => r2UploadBuffer(buffer, fileName, createEnvFromProcessEnv(), options),

  getSignedDownloadUrl: (
    filePath: string,
    options?: Parameters<typeof r2GetSignedDownloadUrl>[2],
  ) => r2GetSignedDownloadUrl(filePath, createEnvFromProcessEnv(), options),

  downloadFile: (filePath: string) =>
    r2DownloadFile(filePath, createEnvFromProcessEnv()),

  deleteFile: (filePath: string) =>
    r2DeleteFile(filePath, createEnvFromProcessEnv()),

  deleteFileByUrl: (fileUrl: string) =>
    r2DeleteFileByUrl(fileUrl, createEnvFromProcessEnv()),

  deleteMultipleFiles: (filePaths: string[]) =>
    r2DeleteMultipleFiles(filePaths, createEnvFromProcessEnv()),

  listFiles: (options?: Parameters<typeof r2ListFiles>[1]) =>
    r2ListFiles(createEnvFromProcessEnv(), options),

  fileExists: (filePath: string) =>
    r2FileExists(filePath, createEnvFromProcessEnv()),
};
