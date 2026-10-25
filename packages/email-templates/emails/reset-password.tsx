// ** import core packages
import { BRAND_CONFIG } from "@repo/config";
import {
  EmailAction,
  EmailContainer,
  EmailText,
} from "./components/EmailContainer";

export interface ResetPasswordEmailProps {
  resetUrl: string;
  userName?: string;
  appName?: string;
}
export function ResetPasswordEmail({
  resetUrl,
  userName = "there",
  appName = BRAND_CONFIG.name,
}: ResetPasswordEmailProps) {
  return (
    <EmailContainer
      appName={appName}
      preview={`Reset your password for ${appName}`}
      title="Reset Your Password"
    >
      <EmailText greeting>Hi {userName}</EmailText>
      <EmailText>
        We received a request to reset your password for your {appName} account.
      </EmailText>
      <EmailAction href={resetUrl}>Reset Password</EmailAction>
      <EmailText>
        If you didn't request a password reset, you can safely ignore this
        email. Your password will stay the same.
      </EmailText>
    </EmailContainer>
  );
}
ResetPasswordEmail.PreviewProps = {
  resetUrl: "https://example.com/reset-password?token=preview",
  userName: "Alex",
} satisfies ResetPasswordEmailProps;

export default ResetPasswordEmail;
