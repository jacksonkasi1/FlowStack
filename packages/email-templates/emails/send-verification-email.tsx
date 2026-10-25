// ** import core packages
import { BRAND_CONFIG } from "@repo/config";
import {
  EmailAction,
  EmailContainer,
  EmailText,
} from "./components/EmailContainer";

export interface VerificationEmailProps {
  verificationUrl: string;
  userName?: string;
  appName?: string;
}
export function SendVerificationEmail({
  verificationUrl,
  userName = "there",
  appName = BRAND_CONFIG.name,
}: VerificationEmailProps) {
  return (
    <EmailContainer
      appName={appName}
      preview={`Verify your email address for ${appName}`}
      title="Please Verify Your Email Address"
    >
      <EmailText greeting>Hi {userName}</EmailText>
      <EmailText>
        Thank you for signing up with {appName}! We just need to verify your
        email address to complete your registration.
      </EmailText>
      <EmailAction href={verificationUrl}>Verify Email</EmailAction>
      <EmailText>
        If you didn't create an account, you can safely ignore this email.
      </EmailText>
    </EmailContainer>
  );
}
SendVerificationEmail.PreviewProps = {
  verificationUrl: "https://example.com/verify-email?token=preview",
  userName: "Alex",
} satisfies VerificationEmailProps;

export default SendVerificationEmail;
