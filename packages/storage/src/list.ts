// ** import core packages
import { HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";

// ** import utils
import { createR2Client } from "./client";

// ** import types
import type {
  Env,
  FileObject,
  ListFilesOptions,
  ListFilesResult,
} from "./types";

export async function r2ListFiles(
  env: Env,
  options?: ListFilesOptions,
): Promise<ListFilesResult> {
  const client = createR2Client(env);

  const command = new ListObjectsV2Command({
    Bucket: env.R2_BUCKET_NAME,
    Prefix: options?.prefix,
    MaxKeys: options?.maxKeys || 100,
    ContinuationToken: options?.continuationToken,
  });

  const response = await client.send(command);

  const files: FileObject[] =
    response.Contents?.map((item) => ({
      key: item.Key || "",
      url: env.R2_PUBLIC_URL
        ? `${env.R2_PUBLIC_URL}/${item.Key}`
        : item.Key || "",
      size: item.Size,
    })) || [];

  return {
    files,
    isTruncated: response.IsTruncated || false,
    nextContinuationToken: response.NextContinuationToken,
  };
}

export async function r2FileExists(
  filePath: string,
  env: Env,
): Promise<boolean> {
  const client = createR2Client(env);

  try {
    const command = new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: filePath,
    });

    await client.send(command);
    return true;
  } catch (error: unknown) {
    // Only return false for NotFound errors
    if (error instanceof Error && "name" in error) {
      if (error.name === "NotFound" || error.name === "NoSuchKey") {
        return false;
      }
      // Check for 404 status in AWS SDK metadata
      if ("$metadata" in error) {
        const metadata = (error as { $metadata?: { httpStatusCode?: number } })
          .$metadata;
        if (metadata?.httpStatusCode === 404) {
          return false;
        }
      }
    }
    // Rethrow other errors (network, auth, permission issues)
    throw error;
  }
}
