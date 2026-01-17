// ** import core packages
import { render } from "@react-email/components";

// ** import utils
import { createEmailClientFromEnv } from "@repo/email";
import { SendVerificationEmail } from "@repo/email-templates";

// ** import types
import type { Env } from "../types";

interface SendVerificationProps {
  to: { address: string; name: string };
  url: string;
}

export async function sendVerificationEmail(
  env: Env,
  props: SendVerificationProps,
): Promise<void> {
  if (!env.ZEPTOMAIL_API_KEY) {
    throw new Error(
      "ZEPTOMAIL_API_KEY is required to send verification emails",
    );
  }

  const emailClient = createEmailClientFromEnv({
    ZEPTOMAIL_API_KEY: env.ZEPTOMAIL_API_KEY,
  });

  const html = await render(
    SendVerificationEmail({
      verificationUrl: props.url,
      userName: props.to.name,
    }),
  );

  await emailClient.sendEmail({
    from: {
      address: env.EMAIL_FROM_ADDRESS || "noreply@example.com",
      name: env.EMAIL_FROM_NAME || "FlowStack",
    },
    to: props.to,
    subject: "Verify your email address",
    html,
  });
}
