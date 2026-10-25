// ** import core packages
import { BRAND_CONFIG } from "@repo/config";
import {
  EmailAction,
  EmailContainer,
  EmailText,
} from "./components/EmailContainer";

export interface InviteUserEmailProps {
  inviteUrl: string;
  inviterName?: string;
  organizationName: string;
  appName?: string;
}
export function InviteUserEmail({
  inviteUrl,
  inviterName = "A teammate",
  organizationName,
  appName = BRAND_CONFIG.name,
}: InviteUserEmailProps) {
  return (
    <EmailContainer
      appName={appName}
      preview={`${inviterName} invited you to ${organizationName}`}
      title={`You've Been Invited to Join ${organizationName}!`}
    >
      <EmailText greeting>
        Hi, you have been invited by {inviterName} to join {appName}.
      </EmailText>
      <EmailText>
        Click the button below to accept the invitation and get started.
      </EmailText>
      <EmailAction href={inviteUrl}>Accept Invitation</EmailAction>
      <EmailText>
        If you weren't expecting this invitation, you can safely ignore this
        email.
      </EmailText>
    </EmailContainer>
  );
}
InviteUserEmail.PreviewProps = {
  inviteUrl: "https://example.com/accept-invitation?invitationId=preview",
  inviterName: "Alex Morgan",
  organizationName: "Example Workspace",
} satisfies InviteUserEmailProps;

export default InviteUserEmail;
