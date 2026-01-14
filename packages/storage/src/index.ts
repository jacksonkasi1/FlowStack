// ** import types
export type {
  Env,
  UploadOptions,
  FileObject,
  ListFilesOptions,
  ListFilesResult,
  DownloadResult,
} from "./types";

// ** import internal
import { createEnvFromProcessEnv } from "./types";
import { createR2Client } from "./client";
import { r2GetSignedUploadUrl, r2UploadBuffer } from "./upload";
import { r2GetSignedDownloadUrl, r2DownloadFile } from "./download";
import {
  r2DeleteFile,
  r2DeleteFileByUrl,
  r2DeleteMultipleFiles,
} from "./delete";
import { r2ListFiles, r2FileExists } from "./list";
import { isValidPath, isValidFileName } from "./utils";

// ** export standalone utils
export {
  createEnvFromProcessEnv,
  createR2Client,
  r2GetSignedUploadUrl,
  r2UploadBuffer,
  r2GetSignedDownloadUrl,
  r2DownloadFile,
  r2DeleteFile,
  r2DeleteFileByUrl,
  r2DeleteMultipleFiles,
  r2ListFiles,
  r2FileExists,
  isValidPath,
  isValidFileName,
};

// ** export r2 client wrapper
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

  isValidPath,
  isValidFileName,
};
