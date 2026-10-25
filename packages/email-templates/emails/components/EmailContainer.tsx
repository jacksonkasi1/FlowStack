// ** import types
import type { ReactNode } from "react";

// ** import core packages
import {
  Button,
  Container,
  Font,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { BRAND_CONFIG } from "@repo/config";

const text = {
  color: "#5E6470",
  fontSize: "16px",
  fontWeight: 400,
  lineHeight: "26px",
  margin: "16px 0",
};

function EmailWordmark({ appName }: { appName: string }) {
  return BRAND_CONFIG.logoUrl ? (
    <Img
      src={BRAND_CONFIG.logoUrl}
      alt={BRAND_CONFIG.logoAlt || appName}
      width={180}
      height={44}
      style={{
        margin: "0 auto",
        width: "180px",
        maxWidth: "100%",
        height: "auto",
      }}
    />
  ) : (
    <Text
      style={{
        color: BRAND_CONFIG.accentColor,
        fontSize: "30px",
        fontWeight: 600,
        lineHeight: "52px",
        margin: 0,
        textAlign: "center",
      }}
    >
      {appName}
    </Text>
  );
}

export function EmailContainer({
  children,
  preview,
  title,
  appName = BRAND_CONFIG.name,
}: {
  children: ReactNode;
  preview: string;
  title: string;
  appName?: string;
}) {
  return (
    <Html style={{ height: "100%" }}>
      <Head>
        <Font
          fontFamily="Lexend"
          fallbackFontFamily="Verdana"
          webFont={{
            url: "https://fonts.gstatic.com/s/lexend/v30/RtKJbxU4oo2bp7zj_qMA.woff2",
            format: "woff2",
          }}
          fontWeight={400}
          fontStyle="normal"
        />
        <style>{`
          @media only screen and (min-width: 600px) {
            .email-content { padding-left: 45px !important; padding-right: 45px !important; }
            .email-card { padding-left: 37.5px !important; padding-right: 37.5px !important; }
          }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <body
        style={{
          backgroundColor: "#FFFFFF",
          fontFamily: "Lexend, Verdana, sans-serif",
          margin: 0,
          padding: 0,
          height: "100%",
        }}
      >
        <table
          role="presentation"
          width="100%"
          border={0}
          cellPadding={0}
          cellSpacing={0}
          style={{ height: "100%", backgroundColor: "#FFFFFF" }}
        >
          <tbody>
            <tr>
              <td style={{ verticalAlign: "top" }}>
                <Container
                  style={{
                    width: "100%",
                    maxWidth: "720px",
                    margin: "0 auto",
                    backgroundColor: BRAND_CONFIG.backgroundColor,
                  }}
                >
                  <Section
                    style={{ padding: "20px 24px 18px", textAlign: "center" }}
                  >
                    <EmailWordmark appName={appName} />
                  </Section>
                  <Section
                    className="email-content"
                    style={{ padding: "24px" }}
                  >
                    <Section
                      className="email-card"
                      style={{
                        backgroundColor: "#FFFFFF",
                        padding: "32px 24px",
                      }}
                    >
                      <Heading
                        style={{
                          color: "#1A1C21",
                          fontSize: "20px",
                          fontWeight: 600,
                          lineHeight: "28px",
                          margin: "20px 0",
                        }}
                      >
                        {title}
                      </Heading>
                      {children}
                    </Section>
                  </Section>
                  <Section
                    style={{
                      backgroundColor: "#FFFFFF",
                      padding: "20px",
                      textAlign: "center",
                    }}
                  >
                    {BRAND_CONFIG.socialLinks.length > 0 && (
                      <table
                        role="presentation"
                        align="center"
                        border={0}
                        cellPadding={0}
                        cellSpacing={0}
                        style={{ margin: "0 auto 16px" }}
                      >
                        <tbody>
                          <tr>
                            {BRAND_CONFIG.socialLinks.map((social, index) => (
                              <td
                                key={social.name}
                                style={{
                                  paddingRight:
                                    index ===
                                    BRAND_CONFIG.socialLinks.length - 1
                                      ? 0
                                      : "32px",
                                }}
                              >
                                <Link
                                  href={social.href}
                                  aria-label={social.name}
                                >
                                  <Img
                                    src={social.iconUrl}
                                    alt={social.name}
                                    width={24}
                                    height={24}
                                    style={{ display: "block", border: 0 }}
                                  />
                                </Link>
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    )}
                    {BRAND_CONFIG.website && (
                      <Text style={{ margin: "0 0 16px", textAlign: "center" }}>
                        <Link
                          href={BRAND_CONFIG.website}
                          style={{
                            color: "#DC3545",
                            fontSize: "14px",
                            textDecoration: "underline",
                          }}
                        >
                          {BRAND_CONFIG.website.replace(/^https?:\/\//, "")}
                        </Link>
                      </Text>
                    )}
                    <EmailWordmark appName={appName} />
                  </Section>
                </Container>
              </td>
            </tr>
            <tr style={{ height: "14px" }}>
              <td
                className="email-bottom-strip"
                height={14}
                style={{
                  height: "14px",
                  backgroundColor: BRAND_CONFIG.accentColor,
                  fontSize: 0,
                  lineHeight: "14px",
                }}
              />
            </tr>
          </tbody>
        </table>
      </body>
    </Html>
  );
}

export function EmailText({
  children,
  greeting = false,
}: {
  children: ReactNode;
  greeting?: boolean;
}) {
  return (
    <Text
      style={
        greeting ? { ...text, color: "#1A1C21", margin: "16px 0 30px" } : text
      }
    >
      {children}
    </Text>
  );
}

export function EmailAction({
  href,
  children,
  icon = "mail",
}: {
  href: string;
  children: ReactNode;
  icon?: "mail" | "lock";
}) {
  return (
    <Section style={{ margin: "16px 0" }}>
      <Button
        href={href}
        style={{
          backgroundColor: BRAND_CONFIG.accentColor,
          borderRadius: 0,
          color: "#FFFFFF",
          fontSize: "16px",
          fontWeight: 500,
          lineHeight: "18px",
          padding: "10px 24px",
          textDecoration: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            marginRight: "10px",
            fontSize: "18px",
            verticalAlign: "middle",
          }}
        >
          {icon === "lock" ? "🔒︎" : "✉"}
        </span>
        <span style={{ verticalAlign: "middle" }}>{children}</span>
      </Button>
      <Text
        style={{
          ...text,
          fontSize: "12px",
          lineHeight: "20px",
          margin: "24px 0 4px",
        }}
      >
        If the button doesn't work, copy this link into your browser:
      </Text>
      <Link
        href={href}
        style={{
          color: "#336DFF",
          fontSize: "12px",
          lineHeight: "20px",
          wordBreak: "break-all",
        }}
      >
        {href}
      </Link>
    </Section>
  );
}
