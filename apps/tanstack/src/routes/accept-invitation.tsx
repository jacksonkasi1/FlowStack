import { isOrganizationMode } from '@repo/config'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthShell, InvitationFlow } from '@repo/auth-ui'
import { authClient } from '@/lib/auth-client'
export const Route = createFileRoute('/accept-invitation')({
  beforeLoad: () => {
    if (!isOrganizationMode()) throw redirect({ to: '/dashboard' })
  },
  validateSearch: (search: Record<string, unknown>) => ({
    invitationId:
      typeof search.invitationId === 'string' ? search.invitationId : undefined,
  }),
  component: AcceptInvitationPage,
})
function AcceptInvitationPage() {
  const { invitationId } = Route.useSearch()
  return (
    <>
      {invitationId ? (
        <InvitationFlow client={authClient} invitationId={invitationId} />
      ) : (
        <AuthShell stage="invitation">
          <h1 className="text-2xl font-semibold">Invitation unavailable</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            This link is missing its invitation details. Ask your workspace
            owner for a new invitation.
          </p>
          <a href="/auth/sign-in" className="mt-5 inline-block underline">
            Go to sign in
          </a>
        </AuthShell>
      )}
    </>
  )
}
