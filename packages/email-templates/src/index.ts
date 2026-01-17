export * from "@react-email/components";

export {
  SendVerificationEmail,
  type VerificationEmailProps,
} from "../emails/send-verification-email";

export {
  ResetPasswordEmail,
  type ResetPasswordEmailProps,
} from "../emails/reset-password";

export {
  InviteUserEmail,
  type InviteUserEmailProps,
} from "../emails/invite-user";

export { MagicLinkEmail, type MagicLinkEmailProps } from "../emails/magic-link";

import { InviteUserEmail } from "../emails/invite-user";
import { MagicLinkEmail } from "../emails/magic-link";
import { ResetPasswordEmail } from "../emails/reset-password";
import { SendVerificationEmail } from "../emails/send-verification-email";

const emailTemplates = {
  SendVerification: SendVerificationEmail,
  ResetPassword: ResetPasswordEmail,
  InviteUser: InviteUserEmail,
  MagicLink: MagicLinkEmail,
} as const;

export default emailTemplates;
