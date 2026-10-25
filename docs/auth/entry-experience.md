# Shared entry screens and email templates

Both React Router and TanStack use the same entry components from `@repo/auth-ui`.
The default artwork is a local, neutral SVG workspace placeholder in each app's
`public/auth/` directory. No product photographs or external image service is
required.

## Brand and content

Edit `packages/config/src/config/brand.ts` to change the app name, image path,
email colors, optional logo URL, website, or auth placeholders. Replace the SVG
in both frontends when changing the image while maintaining both starter options.
`AuthShell` owns the stage-specific copy and accepts an organization name for
invitations. It uses the user's current light or dark theme without modifying
their saved preference.

The organization entry sequence is Account, Workspace, Team. This is three
presentation stages with two server onboarding steps: required organization
creation and optional member invitations. The existing form fields remain the
same. Personal mode uses account creation and getting started without an
organization wizard.

## Reliable onboarding

The wizard reads `/api/auth/onboarding/status` on entry, route changes, and retry.
Typing does not trigger another status request. `getStatusData` in the onboarding
plugin returns application-owned saved values under `data`; the base template
returns the active workspace name after checking membership.

Create, invite, and skip actions check server status after a failed response
before offering a retry. Organization and owner IDs are stable for first-time
setup so concurrent submissions cannot create duplicate workspaces. Previously
saved workspace names can be edited from the invitation step through
`POST /api/auth/onboarding/update-organization`; the server requires an owner
membership and unfinished onboarding. Slugs stay unchanged during that edit.

Session cookies refresh after mutations. `SessionSync` broadcasts changes to
other tabs, and guards revalidate before showing protected content. Success
screens provide a short animation, reduced-motion handling, and Continue now.
`/email-verified` refreshes the session and routes to a pending invitation,
onboarding, or the dashboard. It does not grant verification on its own.

## Email presentation

The four auth emails share `EmailContainer`, `EmailText`, and `EmailAction` in
`packages/email-templates/emails/components/`. These use a neutral, responsive
frame matching the reference: pink surround, centered wordmarks, square white
content block, Lexend typography, red square action buttons, white footer, and
red bottom strip. Preview text, escaped dynamic values, and fallback URLs remain.
The outer presentation table fills short email previews so the strip stays at
the bottom; longer content expands the table and keeps the strip after the email.
The requested demonstration branding uses Peacock India's public PNG logo in the
header and footer, with `example.com` as the footer link. Change `logoUrl`,
`logoAlt`, and `website` in the shared brand config to replace these values.
The reference's generic Twitter, Facebook, and Instagram icons sit above that
link. Their `socialLinks` entries use replaceable example.com destinations.
Existing ZeptoMail delivery and optional email presets are retained.

## Email preview

Run `bun run --cwd packages/email-templates dev:email` and open
`http://localhost:3001`. Each template has neutral `PreviewProps` with example
names and URLs. These sample values are only used by the preview.

The React Email UI dependency is installed explicitly. Its dependency patch uses
the workspace-installed esbuild module so the preview's bundled JavaScript and
the CLI-selected binary stay on the same version. The workspace also pins a
patched Next.js release for the preview server.
