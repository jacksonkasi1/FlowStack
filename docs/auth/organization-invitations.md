# Organization Invitations

Guide for implementing and customizing the organization invitation flow.

## Overview

The invitation system allows organization owners/admins to invite new members via email. The system supports:
- Email-based invitations with expiration
- Invitation acceptance for both existing and new users
- Automatic onboarding skip for invited users
- Organization membership enforcement

## Invitation URL Format

Invitation emails contain a link with the invitation ID as a query parameter:

```
https://your-app.com/accept-invitation?invitationId=abc123
```

### Backend Configuration

**File:** `packages/auth/src/auth.ts`

```ts
organizationPlugin({
  async sendInvitationEmail(data) {
    const inviteLink = `${frontendURL}${AUTH_REDIRECTS.organizationInvitation}?invitationId=${data.id}`;
    
    await sendOrganizationInvitation(env, {
      from: { address: env.EMAIL_FROM_ADDRESS, name: env.EMAIL_FROM_NAME },
      to: { address: data.email, name: "New User" },
      subject: `You've been invited to join ${data.organization.name}!`,
      invitedByUsername: data.inviter.user.name,
      invitedByEmail: data.inviter.user.email,
      teamName: data.organization.name,
      inviteLink,
    });
  },
})
```

### Frontend Route

**File:** `apps/web/src/App.tsx`

```tsx
<Route path="/accept-invitation" element={<AcceptInvitationPage />} />
```

---

## Accept Invitation Page

The accept invitation page handles both authenticated and unauthenticated users.

**File:** `apps/web/src/pages/organization/AcceptInvite.tsx`

### For Authenticated Users

Shows the `AcceptInvitationCard` from `@daveyplate/better-auth-ui`:

```tsx
<SignedIn>
  <AcceptInvitationCard />
</SignedIn>
```

### For Unauthenticated Users

Shows a prompt to sign in or sign up, preserving the invitation context:

```tsx
<SignedOut>
  <Card>
    <CardHeader>
      <CardTitle>You've Been Invited!</CardTitle>
      <CardDescription>
        Sign in or create an account to accept this organization invitation.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <Button onClick={handleSignIn}>Sign In</Button>
      <Button onClick={handleSignUp}>Create Account</Button>
    </CardContent>
  </Card>
</SignedOut>
```

The handlers preserve the invitation ID through authentication:

```tsx
const currentUrl = `/accept-invitation?invitationId=${invitationId}`;

const handleSignIn = () => {
  navigate(`/auth/sign-in?redirectTo=${encodeURIComponent(currentUrl)}`);
};

const handleSignUp = () => {
  navigate(`/auth/sign-up?redirectTo=${encodeURIComponent(currentUrl)}`);
};
```

---

## Auth Page Redirect Support

The auth page reads the `redirectTo` query parameter to redirect users back after authentication.

**File:** `apps/web/src/pages/auth/AuthPage.tsx`

```tsx
const [searchParams] = useSearchParams();
const redirectToParam = searchParams.get("redirectTo");
const redirectTo = redirectToParam || AUTH_REDIRECTS.afterLogin;

return <AuthView pathname={pathname} redirectTo={redirectTo} />;
```

---

## Organization Hooks

### afterAcceptInvitation Hook

Automatically clears onboarding when a user accepts an invitation.

**File:** `packages/auth/src/auth.ts`

```ts
organizationPlugin({
  organizationHooks: {
    afterAcceptInvitation: async ({ user }) => {
      // Clear onboarding - user joined via invitation, no need to create org
      await db
        .update(userTable)
        .set({
          shouldOnboard: false,
          currentOnboardingStep: null,
        })
        .where(eq(userTable.id, user.id));

      logger.info(`Cleared onboarding for user ${user.id} after accepting invitation`);
    },
  },
})
```

---

## Organization Membership Enforcement

Control whether users must belong to an organization to use the product.

### Configuration

**Backend:** `packages/auth/src/config/organization.ts`
**Frontend:** `apps/web/src/config/organization.ts`

```ts
export const ORGANIZATION_CONFIG = {
  /**
   * If true, users MUST belong to an organization to use the product.
   * If false, users can access the product without an organization.
   * @default true
   */
  requireOrganization: true,
} as const;
```

### Backend Enforcement (get-session Hook)

Automatically syncs organization membership status with onboarding state:

**File:** `packages/auth/src/auth.ts`

```ts
hooks: {
  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/get-session") return;

    const memberships = await db.select()
      .from(memberTable)
      .where(eq(memberTable.userId, userData.id));

    // User HAS membership → clear onboarding
    if (memberships.length > 0) {
      const user = await db.select({ shouldOnboard: userTable.shouldOnboard })
        .from(userTable)
        .where(eq(userTable.id, userData.id))
        .limit(1);

      if (user.length > 0 && user[0].shouldOnboard) {
        await db.update(userTable)
          .set({ shouldOnboard: false, currentOnboardingStep: null })
          .where(eq(userTable.id, userData.id));
      }
    }
    // User has NO membership and requireOrganization is enabled → force onboarding
    else if (ORGANIZATION_CONFIG.requireOrganization) {
      const user = await db.select({ shouldOnboard: userTable.shouldOnboard })
        .from(userTable)
        .where(eq(userTable.id, userData.id))
        .limit(1);

      if (user.length > 0 && !user[0].shouldOnboard) {
        await db.update(userTable)
          .set({ shouldOnboard: true, currentOnboardingStep: "createOrganization" })
          .where(eq(userTable.id, userData.id));
      }
    }
  }),
}
```

### Frontend Enforcement (RequireOnboarding)

Guards routes and redirects users without organizations to onboarding.

**File:** `apps/web/src/components/auth/RequireOnboarding.tsx`

```tsx
// Check if user has no active organization AND requireOrganization is enabled
if (ORGANIZATION_CONFIG.requireOrganization && !session?.activeOrganizationId) {
  setNeedsOnboarding(true);
  navigate("/onboarding/create-organization", { replace: true });
  return;
}
```

**File:** `apps/web/src/App.tsx`

Wrap all routes with `RequireOnboarding`:

```tsx
<RequireOnboarding>
  <Routes>
    {/* All routes here */}
  </Routes>
</RequireOnboarding>
```

---

## User Flows

### 1. New User Invited to Organization

1. User receives invitation email
2. Clicks invitation link → `/accept-invitation?invitationId=...`
3. Sees "You've Been Invited!" → clicks "Create Account"
4. Redirected to `/auth/sign-up?redirectTo=/accept-invitation?invitationId=...`
5. Completes signup
6. Redirected back to `/accept-invitation?invitationId=...`
7. Sees `AcceptInvitationCard` → accepts invitation
8. `afterAcceptInvitation` hook clears `shouldOnboard`
9. Redirected to dashboard ✅

### 2. Existing User Invited to Organization

1. User receives invitation email
2. Clicks invitation link → `/accept-invitation?invitationId=...`
3. Sees "You've Been Invited!" → clicks "Sign In"
4. Redirected to `/auth/sign-in?redirectTo=/accept-invitation?invitationId=...`
5. Signs in
6. Redirected back to `/accept-invitation?invitationId=...`
7. Sees `AcceptInvitationCard` → accepts invitation
8. Redirected to dashboard ✅

### 3. User Removed from All Organizations

1. User is last member removed from organization
2. Next time user accesses app:
   - get-session hook detects no membership
   - Sets `shouldOnboard = true` if `requireOrganization` is enabled
3. `RequireOnboarding` component checks session
4. Redirects to `/onboarding/create-organization`
5. User creates new organization
6. Onboarding marked complete
7. Can access dashboard ✅

---

## Customization

### Disable Organization Requirement

Set `requireOrganization: false` in both backend and frontend configs:

```ts
// packages/auth/src/config/organization.ts
export const ORGANIZATION_CONFIG = {
  requireOrganization: false, // ← Users can use app without org
} as const;

// apps/web/src/config/organization.ts  
export const ORGANIZATION_CONFIG = {
  requireOrganization: false, // ← Must match backend
} as const;
```

### Customize Invitation Email

Update the `sendInvitationEmail` function in `packages/auth/src/auth.ts`:

```ts
async sendInvitationEmail(data) {
  // Customize email content here
  await sendOrganizationInvitation(env, {
    subject: `Custom subject`, // ← Change
    // ... other fields
  });
}
```

See [Email Templates](./email-templates.md) for more details.

### Customize Accept Invitation UI

Modify `apps/web/src/pages/organization/AcceptInvite.tsx` to customize the invitation acceptance page UI.

---

## Troubleshooting

### Invitation link doesn't work

**Symptom:** Clicking invitation link shows "Invalid Invitation"

**Solutions:**
1. Verify invitation ID is in URL as query param: `?invitationId=...`
2. Check backend route matches: `/accept-invitation`
3. Ensure invitation hasn't expired (default: 48 hours)

### User stuck in onboarding after accepting invitation

**Symptom:** Invited user keeps getting redirected to onboarding

**Solutions:**
1. Check `afterAcceptInvitation` hook is configured
2. Verify `shouldOnboard` was set to `false` in database
3. Clear session and re-login to trigger get-session hook
4. Check both frontend and backend `requireOrganization` configs match

### User can access app without organization

**Symptom:** User without org membership can access dashboard

**Solutions:**
1. Verify `requireOrganization: true` in **both** configs
2. Check `RequireOnboarding` component wraps all routes
3. Ensure `activeOrganizationId` is null in session
