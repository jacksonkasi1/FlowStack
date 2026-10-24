import { expect, test, type Page } from "@playwright/test";

const MAIL = `http://127.0.0.1:${process.env.E2E_MAIL_PORT || 18025}/mails`;
const PASSWORD = "Browser-Password-123!";

async function verificationLink(email: string) {
  for (let i = 0; i < 50; i++) {
    const mails: { to: string; html: string }[] = await (
      await fetch(MAIL)
    ).json();
    const link = mails
      .findLast((m) => m.to === email && m.html.includes("verify-email"))
      ?.html.replaceAll("&amp;", "&")
      .match(/https?:\/\/[^"'\s<>]*verify-email\?token=[^"'\s<>]+/)?.[0];
    if (link) return link;
    await new Promise((r) => setTimeout(r, 100));
  }
  return null;
}

/**
 * Follows whatever the preset requires after sign-up (email verification,
 * organization onboarding) until the dashboard content is shown. Route guards
 * redirect client-side, so the loop waits for a settled page, not a URL.
 */
async function completeOnboarding(page: Page, email: string) {
  const signedIn = page.getByText("You are signed in.");
  for (let i = 0; i < 12; i++) {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(300);
    if (await signedIn.isVisible()) return;
    const url = page.url();
    if (url.includes("verify-email")) {
      const link = await verificationLink(email);
      expect(link, "verification email was sent").toBeTruthy();
      await page.goto(link!);
    } else if (url.includes("/onboarding/create-organization")) {
      await page
        .getByPlaceholder("Enter your organization name")
        .fill("Browser Team");
      await page.getByRole("button", { name: "Create Organization" }).click();
      await page.waitForURL(/invite-members|dashboard/);
    } else if (url.includes("/onboarding/invite-members")) {
      await page.getByRole("button", { name: "Skip for now" }).click();
      await page.waitForURL(/dashboard/);
    }
  }
  await expect(signedIn).toBeVisible();
}

test("protected pages send anonymous visitors to sign in", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in/);
});

test("sign up, onboard, sign out and sign back in", async ({ page }) => {
  const email = `journey-${Date.now()}@example.com`;
  await page.goto("/auth/sign-up");
  await page.locator("input[name=name]").fill("Journey User");
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/sign-up"));
  await completeOnboarding(page, email);
  await expect(page).toHaveURL(/\/dashboard$/);

  // Sign out from the user menu.
  await page.getByRole("banner").getByRole("button").last().click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/auth\/sign-in/);

  // Wrong password is rejected; the right one restores access.
  await page.locator("input[name=email]").fill(email);
  await page.locator("input[name=password]").fill("Not-The-Password-1!");
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Login", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText("You are signed in.")).toBeVisible();
});
