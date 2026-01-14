// ** import types
export type {
  EmailAddress,
  Personalization,
  CommonEmailProps,
  SendEmailProps,
  SendBatchEmailProps,
  EmailConfig,
  EmailClient,
} from "./zepto";

export type { Env } from "./types";

// ** import utils
export { createEmailClient, createEmailClientFromEnv } from "./zepto";
export { createEnvFromProcessEnv } from "./types";
