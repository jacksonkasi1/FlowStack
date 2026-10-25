// ** import core packages
import { BRAND_CONFIG } from "@repo/config";
import {
  EmailAction,
  EmailContainer,
  EmailText,
} from "./components/EmailContainer";

export interface MagicLinkEmailProps {
  magicLinkUrl: string;
  userName?: string;
  appName?: string;
}
export function MagicLinkEmail({
  magicLinkUrl,
  userName = "there",
  appName = BRAND_CONFIG.name,
}: MagicLinkEmailProps) {
  return (
    <EmailContainer
      appName={appName}
      preview={`Your secure sign-in link for ${appName}`}
      title={`Sign in to ${appName}`}
    >
      <EmailText greeting>Hi {userName}</EmailText>
      <EmailText>
        Click the button below to sign in to your account. This link will expire
        in 10 minutes.
      </EmailText>
      <EmailAction href={magicLinkUrl}>Sign In</EmailAction>
      <EmailText>
        If you didn't request this email, you can safely ignore it.
      </EmailText>
    </EmailContainer>
  );
}
MagicLinkEmail.PreviewProps = {
  magicLinkUrl: "https://example.com/magic-link?token=preview",
  userName: "Alex",
} satisfies MagicLinkEmailProps;

export default MagicLinkEmail;
