export interface Env {
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_ENDPOINT_URL: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL?: string;
}

export function createEnvFromProcessEnv(): Env {
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpointUrl = process.env.R2_ENDPOINT_URL;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accessKeyId || !secretAccessKey || !endpointUrl || !bucketName) {
    throw new Error(
      "R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT_URL, and R2_BUCKET_NAME environment variables are required",
    );
  }

  return {
    R2_ACCESS_KEY_ID: accessKeyId,
    R2_SECRET_ACCESS_KEY: secretAccessKey,
    R2_ENDPOINT_URL: endpointUrl,
    R2_BUCKET_NAME: bucketName,
    R2_PUBLIC_URL: process.env.R2_PUBLIC_URL,
  };
}

export interface UploadOptions {
  contentType?: string;
  organizationId?: string;
  expiresIn?: number;
}

export interface FileObject {
  key: string;
  url: string;
  size?: number;
  contentType?: string;
}

export interface ListFilesOptions {
  prefix?: string;
  maxKeys?: number;
  continuationToken?: string;
}

export interface ListFilesResult {
  files: FileObject[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface DownloadResult {
  data: Uint8Array;
  contentType?: string;
  size?: number;
}
