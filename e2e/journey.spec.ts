import { expect, test, type Page } from "@playwright/test";

const MAIL = `http://127.0.0.1:${process.env.E2E_MAIL_PORT || 18025}/mails`;
const API = `http://localhost:${process.env.E2E_API_PORT || 18080}`;
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
    const url = page.url();
    // TanStack can retain the outgoing dashboard while the onboarding route loads.
    if (new URL(url).pathname === "/dashboard" && (await signedIn.isVisible()))
      return;
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
  // The write succeeds, but the browser receives a gateway failure instead.
  await page.route(
    "**/api/auth/onboarding/step/create-organization",
    async (route) => {
      const saved = await route.fetch();
      expect(saved.ok()).toBe(true);
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: {
          "access-control-allow-origin": new URL(page.url()).origin,
          "access-control-allow-credentials": "true",
        },
        body: JSON.stringify({ message: "The response was interrupted." }),
      });
    },
    { times: 1 },
  );
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
  const otherTab = await page.context().newPage();
  await otherTab.goto("/dashboard");
  await expect(otherTab.getByText("You are signed in.")).toBeVisible();
  await page.getByRole("banner").getByRole("button").last().click();
  await page.getByRole("menuitem", { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/auth\/sign-in/);
  await expect(otherTab).toHaveURL(/\/auth\/sign-in/);
  await otherTab.close();
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

test("entry layout uses a neutral placeholder and fits a narrow screen", async ({
  page,
}) => {
  await page.goto("/auth/sign-up");
  await expect(
    page.getByRole("heading", { name: "Make room for your next idea." }),
  ).toBeVisible();
  await expect(
    page.locator('img[src="/auth/workspace-placeholder.svg"]'),
  ).toBeAttached();
  await expect(
    page.getByRole("status", { name: "Opening workspace" }),
  ).toBeHidden();
  await page.screenshot({
    path: test.info().outputPath("entry-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('input[name="email"]')).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("entry-mobile.png"),
    fullPage: true,
  });
});

test("an invitation creates the matching account and joins without a second verification or join click", async ({
  page,
  browser,
}) => {
  const suffix = Date.now();
  const ownerEmail = `invite-owner-${suffix}@example.com`;
  const invitedEmail = `invite-recipient-${suffix}@example.com`;
  await page.goto("/auth/sign-up");
  await page.locator("input[name=name]").fill("Workspace Owner");
  await page.locator("input[name=email]").fill(ownerEmail);
  await page.locator("input[name=password]").fill(PASSWORD);
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/sign-up"));
  await completeOnboarding(page, ownerEmail);
  const response = await page.request.post(
    `${API}/api/auth/organization/invite-member`,
    {
      headers: { Origin: new URL(page.url()).origin },
      data: { email: invitedEmail, role: "member" },
    },
  );
  if (response.status() === 404) {
    test.skip(true, "Personal preset has no invitations");
    return;
  }
  expect(response.ok()).toBe(true);
  const invitation = await response.json();
  const context = await browser.newContext({
    baseURL: new URL(page.url()).origin,
  });
  const invitee = await context.newPage();
  try {
    await invitee.goto(`/accept-invitation?invitationId=${invitation.id}`);
    await expect(invitee.locator('input[name="email"]')).toHaveValue(
      invitedEmail,
    );
    await expect(invitee.locator('input[name="email"]')).toHaveAttribute(
      "readonly",
      "",
    );
    await invitee.locator('input[name="name"]').fill("New Teammate");
    await invitee.locator('input[name="password"]').fill(PASSWORD);
    await invitee
      .getByRole("button", { name: "Create account and continue" })
      .click();
    await expect(invitee).toHaveURL(/\/dashboard$/);
    await expect(invitee.getByText("You are signed in.")).toBeVisible();
  } finally {
    await context.close();
  }
});
