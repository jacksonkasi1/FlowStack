// ** import core packages
import { S3Client } from "@aws-sdk/client-s3";

// ** import types
import type { Env } from "./types";

export function createR2Client(env: Env): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT_URL,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
}
