// ** import core packages
import { render } from "@react-email/components";

// ** import utils
import { createEmailClientFromEnv } from "@repo/email";
import { MagicLinkEmail } from "@repo/email-templates";

// ** import types
import type { Env } from "../types";

interface MagicLinkEmailParams {
  to: {
    address: string;
    name: string;
  };
  url: string;
}

export async function sendMagicLink(
  env: Env,
  params: MagicLinkEmailParams,
): Promise<void> {
  if (!env.ZEPTOMAIL_API_KEY) {
    throw new Error("ZEPTOMAIL_API_KEY is required to send magic link emails");
  }

  const emailClient = createEmailClientFromEnv({
    ZEPTOMAIL_API_KEY: env.ZEPTOMAIL_API_KEY,
  });

  const html = await render(
    MagicLinkEmail({
      magicLinkUrl: params.url,
      userName: params.to.name,
    }),
  );

  await emailClient.sendEmail({
    from: {
      address: env.EMAIL_FROM_ADDRESS || "noreply@example.com",
      name: env.EMAIL_FROM_NAME || "FlowStack",
    },
    to: params.to,
    subject: "Sign in to your account",
    html,
  });
}
