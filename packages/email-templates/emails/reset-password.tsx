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

export interface ResetPasswordEmailProps {
  resetUrl: string;
  userName?: string;
  appName?: string;
}

export function ResetPasswordEmail({
  resetUrl,
  userName = "there",
  appName = "FlowStack",
}: ResetPasswordEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password for {appName}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto max-w-xl bg-white p-8">
            <Heading className="text-2xl font-bold text-gray-900">
              Reset your password
            </Heading>
            <Text className="text-gray-600">Hi {userName},</Text>
            <Text className="text-gray-600">
              We received a request to reset your password. Click the button
              below to create a new password.
            </Text>
            <Section className="my-6 text-center">
              <Button
                className="rounded-md bg-blue-600 px-6 py-3 text-white"
                href={resetUrl}
              >
                Reset Password
              </Button>
            </Section>
            <Text className="text-sm text-gray-500">
              If you didn&apos;t request a password reset, you can safely ignore
              this email. The link will expire in 24 hours.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default ResetPasswordEmail;
