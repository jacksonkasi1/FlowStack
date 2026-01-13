import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { Tailwind } from "@react-email/tailwind";

export interface InviteUserEmailProps {
  inviteUrl: string;
  inviterName?: string;
  organizationName: string;
  appName?: string;
}

export function InviteUserEmail({
  inviteUrl,
  inviterName = "Someone",
  organizationName,
  appName = "FlowStack",
}: InviteUserEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {inviterName} invited you to join {organizationName}
      </Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl bg-white p-8">
            <Heading className="text-2xl font-bold text-gray-900">
              You&apos;ve been invited
            </Heading>
            <Text className="text-gray-600">
              {inviterName} has invited you to join{" "}
              <strong>{organizationName}</strong> on {appName}.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-md bg-blue-600 px-6 py-3 text-white"
                href={inviteUrl}
              >
                Accept Invitation
              </Button>
            </Section>
            <Text className="text-sm text-gray-500">
              If you don&apos;t want to join, you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default InviteUserEmail;
