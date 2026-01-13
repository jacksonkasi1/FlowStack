// ** import core packages
import { render } from "@react-email/components";

// ** import utils
import { createEmailClientFromEnv } from "@repo/email";
import { ResetPasswordEmail } from "@repo/email-templates";

// ** import types
import type { Env } from "../types";

interface SendResetPasswordProps {
  from: { address: string; name: string };
  to: { address: string; name: string };
  subject: string;
  url: string;
}

export async function sendResetPassword(
  env: Env,
  props: SendResetPasswordProps,
): Promise<void> {
  const emailClient = createEmailClientFromEnv({
    ZEPTOMAIL_API_KEY: env.ZEPTOMAIL_API_KEY || "",
  });

  const html = await render(
    ResetPasswordEmail({
      resetUrl: props.url,
      userName: props.to.name,
    }),
  );

  await emailClient.sendEmail({
    from: props.from,
    to: props.to,
    subject: props.subject,
    html,
  });
}
