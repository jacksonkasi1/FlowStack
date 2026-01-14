// ** import types
export interface Env {
  ZEPTOMAIL_API_KEY: string;
  ZEPTO_URL?: string;
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
}

export function createEnvFromProcessEnv(): Env {
  const apiKey = process.env.ZEPTOMAIL_API_KEY;

  if (!apiKey) {
    throw new Error("ZEPTOMAIL_API_KEY environment variable is required");
  }

  return {
    ZEPTOMAIL_API_KEY: apiKey,
    ZEPTO_URL: process.env.ZEPTO_URL,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  };
}
