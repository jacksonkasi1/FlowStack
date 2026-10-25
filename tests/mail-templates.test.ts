// ** import core packages
import { expect, test } from "bun:test";
import { render } from "@react-email/components";
import {
  InviteUserEmail,
  MagicLinkEmail,
  ResetPasswordEmail,
  SendVerificationEmail,
} from "../packages/email-templates/src";

test("authentication emails share configured branding and preserve dynamic, escaped content and fallback links", async () => {
  const url = "https://app.example.test/continue?token=test&next=workspace";
  const templates = [
    InviteUserEmail({
      inviteUrl: url,
      inviterName: "Alex",
      organizationName: "Research <Team>",
      appName: "Example App",
    }),
    SendVerificationEmail({
      verificationUrl: url,
      userName: "Sam <Admin>",
      appName: "Example App",
    }),
    ResetPasswordEmail({
      resetUrl: url,
      userName: "Sam",
      appName: "Example App",
    }),
    MagicLinkEmail({ magicLinkUrl: url, appName: "Example App" }),
  ];
  for (const template of templates) {
    const html = await render(template);
    expect(html).toContain("Example App");
    expect(html).toContain("copy this link into your browser");
    expect(html.replaceAll("&amp;", "&")).toContain(url);
    expect(html).not.toMatch(/vizfleet|imagekit/i);
    expect(html).toContain(
      'src="https://www.peacockindia.com/peacock-logo-sm.png"',
    );
    expect(html.match(/alt="Peacock India"/g)).toHaveLength(2);
    expect(html).toContain('href="https://example.com"');
    for (const social of ["Twitter", "Facebook", "Instagram"]) {
      expect(html).toContain(`alt="${social}"`);
      expect(html).toContain(
        `href="https://example.com/${social.toLowerCase()}"`,
      );
    }
    expect(html).toContain("#FEE9EA");
    expect(html).toContain("#ED2124");
    expect(html).toContain("border-radius:0");
    expect(html).toContain("max-width:720px");
    expect(html).toContain("Lexend");
    expect(html).not.toContain("border-top:4px solid");
    expect(html).not.toContain("border-radius:12px");
  }
  expect(await render(templates[0])).toContain("Research &lt;Team&gt;");
  expect(await render(templates[1])).toContain("Sam &lt;Admin&gt;");
});
