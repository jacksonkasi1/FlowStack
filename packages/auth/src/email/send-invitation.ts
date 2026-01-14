// ** import core packages
import { render } from "@react-email/components";

// ** import utils
import { createEmailClientFromEnv } from "@repo/email";
import { InviteUserEmail } from "@repo/email-templates";

// ** import types
import type { Env } from "../types";

interface SendInvitationProps {
  from: { address: string; name: string };
  to: { address: string; name: string };
  subject: string;
  invitedByUsername: string;
  invitedByEmail: string;
  teamName: string;
  inviteLink: string;
}

export async function sendOrganizationInvitation(
  env: Env,
  props: SendInvitationProps,
): Promise<void> {
  if (!env.ZEPTOMAIL_API_KEY) {
    throw new Error("ZEPTOMAIL_API_KEY is required to send invitation emails");
  }

  const emailClient = createEmailClientFromEnv({
    ZEPTOMAIL_API_KEY: env.ZEPTOMAIL_API_KEY,
  });

  const html = await render(
    InviteUserEmail({
      inviteUrl: props.inviteLink,
      inviterName: props.invitedByUsername,
      organizationName: props.teamName,
    }),
  );

  await emailClient.sendEmail({
    from: props.from,
    to: props.to,
    subject: props.subject,
    html,
  });
}
