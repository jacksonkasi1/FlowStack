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

export interface VerificationEmailProps {
  verificationUrl: string;
  userName?: string;
  appName?: string;
}

export function SendVerificationEmail({
  verificationUrl,
  userName = "there",
  appName = "FlowStack",
}: VerificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address for {appName}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl bg-white p-8">
            <Heading className="text-2xl font-bold text-gray-900">
              Verify your email
            </Heading>
            <Text className="text-gray-600">Hi {userName},</Text>
            <Text className="text-gray-600">
              Please verify your email address by clicking the button below.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-md bg-blue-600 px-6 py-3 text-white"
                href={verificationUrl}
              >
                Verify Email
              </Button>
            </Section>
            <Text className="text-sm text-gray-500">
              If you didn&apos;t create an account, you can safely ignore this
              email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default SendVerificationEmail;
