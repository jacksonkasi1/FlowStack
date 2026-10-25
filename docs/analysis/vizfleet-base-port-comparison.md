# VizFleet base improvements for FlowStack

The reusable changes are the authentication layout, contextual panel content, progress presentation, invitation shortcuts, reliable onboarding transitions, success feedback, and shared email styling. FlowStack already contains several invitation and session fixes, so the port should extend those implementations rather than replace them wholesale.

The scope is the base template. Notification features are excluded following the updated request. Keep the existing onboarding form fields and account modes. Fleet setup, Malaysian phone rules, transport permissions, and the VizFleet service architecture remain outside this port.

## Comparison baseline

| Role               | Local checkout                                                                           | Commit at start of inspection |
| ------------------ | ---------------------------------------------------------------------------------------- | ----------------------------- |
| Destination        | `/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack`                             | `7caa685`                     |
| Frontend reference | `/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms` with emphasis on `apps/base` | `941c78e9`                    |
| Backend reference  | `/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server`                        | `3ffe84f4`                    |

The frontend and backend references contain integration differences described below. Existing feature specifications provide history; current code determines the copy list. Instructions inside those specifications to deploy, commit, or change other apps do not expand this request.

## What FlowStack already has

| Capability                           | Current behavior                                                                                                    | Port decision                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Direct invitation signup             | A valid invitation opens signup for a new email and signin for an existing account.                                 | Preserve.                                               |
| Locked invitation email              | The shared invitation form prefills the recipient and makes it read-only by default.                                | Preserve; add contextual layout around it.              |
| Invitation validation                | Server checks pending status, expiry, and recipient email.                                                          | Preserve as the authority.                              |
| Skip workspace creation for invitees | Configurable invitation signup bypass; guards recover pending invitations for users without an active organization. | Preserve.                                               |
| Return from verification             | Verification links can retain the invitation callback.                                                              | Preserve when adding the success screen.                |
| Multiple organization policy         | Shared configuration controls the menu and server creation permission.                                              | Preserve; do not replace with TMS assumptions.          |
| Session freshness                    | Onboarding and invitation acceptance refresh signed cookies; guards can bypass cookie cache.                        | Preserve. TMS disables cookie caching instead.          |
| Required and optional onboarding     | Required organization creation and optional team invitations already exist.                                         | Preserve their form schemas and skip behavior.          |
| Onboarding ownership                 | Existing organization membership does not automatically finish all onboarding steps.                                | Preserve.                                               |
| Two frontends and two account modes  | React Router and TanStack implementations support personal and organization presets.                                | Every shared change must work in all four combinations. |

Evidence: [shared invitation form](/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack/packages/auth-ui/src/invitation-flow.tsx), [server invitation policy](/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack/packages/auth/src/invitation-policy.ts), [invitation configuration](/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack/packages/config/src/config/invitations.ts), [auth configuration and cookie refresh hooks](/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack/packages/auth/src/auth.ts:256), and [shared guard](/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack/packages/auth-ui/src/guards/use-guard.tsx).

## Authentication and onboarding UI to copy

| Item                        | TMS behavior                                                                                                                      | Apply to FlowStack                                                                                                                                                 |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Split page layout           | Image-backed left pane occupies about 42–45% on desktop; white form pane scrolls independently. Mobile uses a compact brand band. | Add a reusable shell around signin, signup, password reset, and onboarding.                                                                                        |
| Separate images by stage    | Signin and signup use different WebP images with dark overlays and a subtle grid.                                                 | Make image sources configurable. The inspected signup photo contains VizFleet branding and trucks; it is a reference asset rather than a neutral template default. |
| Contextual panel content    | Eyebrow, headline, explanation, three items, and footer vary between signin, signup, invitation, and onboarding.                  | Move content into shared configuration with generic workspace wording.                                                                                             |
| Numbered stage list         | Numbered squares distinguish active, completed, and upcoming stages; signin uses check icons.                                     | Reuse the presentation and transitions, deriving the list from actual stages.                                                                                      |
| Dynamic invitation content  | The panel names the organization and explains joining an existing team.                                                           | Feed it from FlowStack's existing invitation context endpoint.                                                                                                     |
| Progress header             | Current onboarding shows `Step 01 / 03`, section label, and an animated progress line.                                            | Reuse the treatment, with the count derived from configured stages.                                                                                                |
| Form presentation           | Borderless auth card, aligned heading, consistent input/button heights, sharp corners, corrected password-toggle placement.       | Apply styling without changing fields or validation.                                                                                                               |
| Field-specific placeholders | Name, email, current password, new password, and confirmation have distinct helper text.                                          | Reuse localization configuration in both providers.                                                                                                                |
| Inline saving feedback      | Button spinner sits directly before the label; relevant controls disable during submission.                                       | Apply to existing create, invite, and skip actions.                                                                                                                |
| Theme restoration           | Auth pages pin the intended light appearance and restore the saved theme on exit.                                                 | Adapt to FlowStack's theme provider and storage key; avoid copying the VizFleet storage key.                                                                       |

For the requested three-stage design, use **Account → Workspace → Team** across signup and organization onboarding. The existing workspace and invitation forms remain the two server onboarding steps. Account creation is already complete when workspace setup starts. Personal mode gets its own shorter progression. This avoids adding a third form merely to match the TMS illustration.

The source hardcodes fleet copy and three steps, so its panel should become configurable before reuse. Partner logos and the old dashboard backdrop are not part of the current shell's rendered panel and should not be copied as active UI.

Sources: [split shell](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/components/custom/auth/AuthSplitShell.tsx), [panel variants](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/components/custom/auth/AuthSidePanel.tsx), [auth wrapper](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/pages/auth/index.tsx), [progress rendering](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/pages/Onboarding.tsx:429), and [placeholder configuration](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/providers.tsx:22).

## Onboarding behavior and backend changes to adapt

1. **Use onboarding status to resume the wizard.** TMS reads the authenticated `/onboarding/status` response for the current step and completed steps. FlowStack's pages currently initialize from session user fields. Use the status endpoint as the wizard authority while retaining pending-invitation recovery.
2. **Keep the shell visible.** Initial status loading and retry errors remain inside the split layout. Step transitions keep useful content mounted instead of replacing the page with a full-screen loader.
3. **Fetch on entry and step changes.** Keep form values out of status-effect dependencies. The source explicitly fixed a request/spinner on every mobile-number keystroke; FlowStack should retain that invariant for its own fields.
4. **Recover after uncertain saves.** If a create, invite, or skip response times out, read status before offering another submission. Advance if the server already saved it. Use bounded requests and separate authentication failure from retryable network/server errors.
5. **Synchronize session state before navigation.** Reuse the source's shared session-query and `onSessionChange` patterns, adapted to both routers. Preserve FlowStack's server cookie refresh rather than replacing it with source configuration.
6. **Synchronize tabs.** Broadcast signin/signout/session changes and clear or refresh cached session data in other tabs. The single-template app needs no microfrontend host contexts.
7. **Support safe replay of organization creation.** TMS reuses an existing onboarding organization and conflict-safe identifiers. Adapt that property to FlowStack's current membership and multi-organization rules so a delayed response or repeated request cannot create another workspace.
8. **Allow previous-step editing only where implemented.** TMS permits editing saved company/fleet steps with `once: false`. For FlowStack this needs a scoped organization update path, restored values, and authorization before offering Back navigation. Do not simply turn off the existing one-time check.
9. **Expose saved values through a generic status hook.** The source plugin adds `getStatusData`, receiving the user and active organization IDs. Port that extension to return allowed base fields such as organization name, without importing IAM/mobile/fleet storage.
10. **Keep completed steps consistent.** The source avoids duplicate completed-step entries on editable submissions and calculates the first incomplete step from configured order. Adapt this for the current two-step flow; any future required-step insertion needs an explicit policy for already-completed accounts.

Sources: [status loading and recovery](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/pages/Onboarding.tsx:171), [canonical session query](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/lib/auth-query.ts), [cross-tab synchronization](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/lib/auth-sync.tsx), [repeatable organization setup](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/auth/src/auth.ts:677), and [plugin status extension](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/onboarding/src/index.ts:254).

## Invitation friction to remove

| Stage                    | FlowStack now                                                               | Proposed behavior from TMS                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation landing       | Already shows the appropriate signup/signin form directly.                  | Keep it and add the contextual split panel.                                                                                                                   |
| New invitee verification | Creates an unverified account, then asks for a separate verification email. | A server-validated invitation link for the matching email can satisfy verification during account creation. Skip the redundant email for that case.           |
| Acceptance               | Matching verified user clicks Join organization.                            | Automatically accept a valid invitation after the matching account is authenticated.                                                                          |
| Active workspace         | Acceptance updates server state.                                            | Confirm the invited organization is active and refresh session before entering the app.                                                                       |
| Different account        | Explains the mismatch and offers signout.                                   | Keep that protection and provide a direct signout-and-continue action.                                                                                        |
| Success                  | Goes directly to dashboard.                                                 | Show the reusable success animation, then navigate.                                                                                                           |
| Unavailable link         | Generic invalid/expired message.                                            | Use explicit invalid, expired, canceled, or already-used states where the server exposes them. Keep recovery actions and retryable network failures separate. |

Invitation proof must be validated on the server using the invitation ID, recipient email, pending status, and expiry. A query string email or redirect target alone cannot mark an account verified. The TMS client sends an invitation ID header, and a user-creation hook performs this check. Adapt the mechanism to the existing FlowStack invitation policy and use a template-owned header name if needed.

This is a deliberate authentication policy change. Existing FlowStack tests require invitees to verify separately and will need updated expectations plus cases for mismatched recipients, expired/replayed links, existing accounts, and ordinary non-invitation signup. Existing unverified accounts must not become verified merely because their email matches a preview; that case needs explicit validated handling or the current verification fallback.

Sources: [TMS invitation landing and automatic acceptance](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/pages/organization/AcceptInvite.tsx), [signup request integration](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/lib/auth-client.ts:36), [server verification hook](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/auth/src/auth.ts:451), and [current FlowStack invitation tests](/Users/jacksonnkasi/Desktop/micro-sass/flowstock/FlowStack/tests/auth.integration.test.ts:227).

## Animation and loading to copy

- **Reusable success screen:** play the Lottie animation once, hold its success frame, show a contextual title/message, and navigate after approximately 1.8 seconds. Use it after invitation acceptance and email verification.
- **Verification completion route:** add a success destination that refreshes session and chooses onboarding or dashboard. Preserve invitation callback context instead of routing every verification to the dashboard.
- **One startup overlay:** reuse the logo and short progress-line treatment once per document load, dismissed when the route is ready and the minimum display time finishes. Keep it off verification screens and avoid replaying it on ordinary navigation.
- **Small transitions:** retain stage highlight and progress-line transitions. Add reduced-motion/static fallbacks and timer cleanup when adapting the success component.

Do not restore the old Dashboard/Create Booking chooser. It was removed from the current source, and Create Booking is outside the base template.

Sources: [success animation](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/components/custom/SuccessSplash.tsx), [verification completion](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/pages/account/EmailVerified.tsx), [startup overlay](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/components/ui/startup-splash.tsx), and [route-ready signal](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/components/ui/startup-ready.tsx).

## Email templates to copy

1. **Shared email frame:** one container for the logo, brand background, white message section, typography, footer, and accent strip. FlowStack currently duplicates the outer markup in each template.
2. **Consistent action button:** shared sizing, alignment, icon placement, and visual treatment across invitation, verification, password reset, and magic link emails.
3. **All four authentication templates:** adapt their hierarchy, greeting, explanatory copy, and CTA to the shared container rather than changing only the invitation email.
4. **Dynamic brand values:** app name, logo URL, accent/background colors, website, and optional footer links must come from template configuration. The TMS container hardcodes VizFleet branding and external image hosts even though individual templates accept `appName`.
5. **Dynamic recipient and organization values:** preserve the current typed recipient, inviter, organization, and callback URL props and sender functions.
6. **Delivery continuity:** retain ZeptoMail and `TEMPLATE_FEATURES.email`; no new provider or queue is required for the visual update.

Keep FlowStack's preview text and ignore-this-email messages where useful; the TMS versions remove some of them. Preserve the magic link's fallback URL and extend a consistent fallback treatment to other actions if needed. Match expiry copy to actual auth settings. Use email-safe layout for buttons/header/footer and verify rendered HTML rather than copying browser flex layout unchanged.

The TMS export-ready email is reusable only if the starter later gains an export/download feature. Customer invoice and vendor statement Email Control settings, token substitution, and inheritance are separate business features and are excluded from the auth email port.

Sources: [shared email container](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/email-templates/emails/components/EmailContainer.tsx), [invitation template](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/email-templates/emails/invite-user.tsx), [verification template](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/email-templates/emails/send-verification-email.tsx), [reset template](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/email-templates/emails/reset-password.tsx), and [magic link template](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/packages/email-templates/emails/magic-link.tsx).

## Additional common feature to keep optional

TMS also includes Turnstile on email signin/signup, with client token lifecycle and server verification of token, action, and hostname. This is reusable, but it changes setup requirements and is separate from the requested UI and friction improvements. If included later, make it a template integration with explicit environment configuration and coverage for both the ordinary auth UI and invitation forms.

Do not copy the gateway condition verbatim: its comment says beta/production protection, but the current expression explicitly excludes `sandbox`, `beta`, and `prod`. The starter needs its own clear enablement policy. Do not copy the gateway's synthetic Origin fallback, driver phone translation, or blanket cookie removal as part of the layout change.

Sources: [Turnstile UI](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-tms/apps/base/src/components/custom/auth/AuthTurnstile.tsx), [verifier](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/apps/api-gateway/src/lib/auth/turnstile.ts), and [gateway auth wrapper](/Users/jacksonnkasi/Desktop/peacock/vizfleet/vizfleet-v4-server/apps/api-gateway/src/routes/api/index.ts:38).

## Source differences that prevent direct copying

| Finding                                                                                                                                                                                                           | Consequence for the port                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TMS onboarding invite UI now only calls the step endpoint; the backend handler returns email values and records completion without creating invitations.                                                          | Preserve FlowStack's actual `organization.inviteMember` calls, or move real sending into a tested server operation. Copying this TMS path would lose invitation delivery. |
| Frontend invitation preview calls `/api/public/invitations/:id`; the supplied server checkout does not contain a matching route or `hasAccount` response implementation in the searched application/package code. | Reuse FlowStack's existing `/api/auth/invitation/context` endpoint.                                                                                                       |
| Gateway verification rewrites every verification callback to `/email-verified`; its completion page chooses onboarding or root without carrying an invitation ID.                                                 | Preserve FlowStack's invitation callback behavior and use the success route without losing that context.                                                                  |
| Source onboarding signup hook returns custom JSON; FlowStack preserves the Better Auth signup response and refreshes the session cookie.                                                                          | Keep FlowStack's response contract and merge only the useful status/persistence changes.                                                                                  |
| Source secondary-storage parsing uses a weaker fallback expression than FlowStack.                                                                                                                                | Keep the destination implementation.                                                                                                                                      |
| Source specs describe a destination chooser and notification designs that changed over time.                                                                                                                      | Use the current auth and onboarding routes as the reference. Notifications are excluded from this port at the user's request.                                             |
| Source UI depends on VizFleet tokens, aliases, IAM, timezone stores, and MFE contexts.                                                                                                                            | Map presentation to FlowStack tokens and shared packages; omit product and deployment dependencies.                                                                       |

## Destination changes and implementation order

| Batch           | Destination                                                            | Result                                                                                                                                    |
| --------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 1               | Shared auth UI/config plus auth and onboarding pages in both frontends | Split shell, configurable imagery/copy, real stage progress, form styling, placeholders.                                                  |
| 2               | Shared invitation flow, auth policy/hooks, completion routes           | Valid invitation proof, automatic acceptance, active organization refresh, success animation, preserved verification callbacks.           |
| 3               | Onboarding plugin and auth step handlers, both wizard pages            | Status-based resume, persisted base values, safe create replay, controlled previous-step editing, timeout reconciliation, stable loading. |
| 4               | Shared email templates and auth sender inputs                          | One configurable visual system for four auth emails.                                                                                      |
| Separate option | Setup/config and auth request boundary                                 | Turnstile integration if desired.                                                                                                         |

Prefer existing `packages/auth-ui`, `packages/config`, `packages/onboarding`, and `packages/email-templates` for shared logic. Keep navigation wrappers and page integration specific to each router. New API calls follow the destination's centralized axios/rest-api conventions. The remaining UI, invitation, onboarding, and email changes do not require a new database migration.

## Verification required during implementation

- Check signin, signup, reset password, onboarding, verification success, and invitation success at desktop and mobile sizes, with light/dark preferences and reduced motion.
- Check new invitee, existing account, mismatched account, invalid/expired/canceled/used link, direct signup settings, unlocked-email setting, and onboarding-skip setting.
- Check refresh/resume, double submission, delayed responses, successful save with lost response, optional skip, Back editing, and session updates in another tab.
- Preserve normal organization creation restrictions and personal-mode behavior, plus optional email/storage/social-provider presets.
- Check email rendering, actual invitation delivery through the local catcher, URL destinations, configured branding, and verification-email suppression only for validated invite signup.
- Run the destination's required lint, types, tests, build, browser flow checks, and preset verification for implementation batches. Reuse existing auth/API tests and add cases for changed behavior.

This comparison is based on local code and asset inspection. Runtime browser behavior and email-client rendering remain implementation validation tasks. No product code, source-repository trackers, credentials, deployment settings, or existing local changes were modified by this analysis.
