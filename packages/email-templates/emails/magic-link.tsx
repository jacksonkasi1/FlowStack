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

export interface MagicLinkEmailProps {
  magicLinkUrl: string;
  userName?: string;
  appName?: string;
}

export function MagicLinkEmail({
  magicLinkUrl,
  userName = "there",
  appName = "FlowStack",
}: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Sign in to {appName}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl bg-white p-8">
            <Heading className="text-2xl font-bold text-gray-900">
              Sign in to {appName}
            </Heading>
            <Text className="text-gray-600">Hi {userName},</Text>
            <Text className="text-gray-600">
              Click the button below to sign in to your account. This link will
              expire in 10 minutes.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-md bg-blue-600 px-6 py-3 text-white"
                href={magicLinkUrl}
              >
                Sign In
              </Button>
            </Section>
            <Text className="text-sm text-gray-500">
              If you didn&apos;t request this email, you can safely ignore it.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default MagicLinkEmail;
