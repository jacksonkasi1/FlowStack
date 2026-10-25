# Invitations and multiple organizations

Set these flags in both `apps/server/.env` and your selected frontend's `.env`.
Restart the API and Vite after changing them; rebuild production frontends.
The shared defaults live in `packages/config/src/config/invitations.ts`.

```dotenv
VITE_INVITE_DIRECT_SIGNUP=true
VITE_INVITE_LOCK_EMAIL=true
VITE_INVITE_SKIP_ORGANIZATION_ONBOARDING=true
VITE_ALLOW_MULTIPLE_ORGANIZATIONS=false
```

By default, opening a valid invitation displays the signup form immediately for
a new account. The invited email is prefilled and read-only, and there is no
sign-in/signup selection screen. A recipient who already has an account receives
the sign-in form instead. A different signed-in account must sign out first.

For a new account, the server validates the invitation ID, pending status,
expiry, and recipient email before treating the invitation as email verification.
No second verification email is sent for that signup. The matching authenticated
recipient joins automatically and sees a success screen before entering the
workspace. Existing unverified accounts retain the verification fallback;
verification links return to the invitation. Dashboard and onboarding guards recover pending invitations
for signed-in users without an active organization. Invalid, canceled, accepted,
and expired invitations cannot start this flow.

Set `VITE_INVITE_DIRECT_SIGNUP=false` to show the sign-in/signup choice. Set
`VITE_INVITE_LOCK_EMAIL=false` to make the input editable; the server still requires
the invitation recipient's email to prevent using another person's invitation.
Set `VITE_INVITE_SKIP_ORGANIZATION_ONBOARDING=false` to retain normal onboarding
state for invite signups. After accepting an invitation, membership satisfies the
organization requirement regardless of this setting.

`VITE_ALLOW_MULTIPLE_ORGANIZATIONS=true` displays an Organizations menu after login,
with organization switching and a creation form. The server permits additional
organization creation only when enabled. With the default `false`, the menu is
absent and an existing member cannot create another organization through either
the Better Auth creation endpoint or the onboarding endpoint. Normal first-time
organization onboarding still works. This flag controls creation, not whether a
user can accept invitations into other organizations.

Frontend flags are public configuration, never secrets. The server enforces the
recipient and creation rules independently of what the browser displays.

`INVITATION_CONFIG.verifyEmailFromInvitation` and `autoAccept` in the shared
configuration control invitation verification and automatic acceptance. Set the
former to `false` to require a separate verification email for new invitees, or
the latter to `false` to retain an explicit Join organization button. Ordinary
signup still sends a verification email. With organization-onboarding bypass
disabled, a new invitee completes setup before returning to accept the invitation.
