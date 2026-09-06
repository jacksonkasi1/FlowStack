import { isOrganizationMode } from '@repo/config'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { InvitationFlow } from '@repo/auth-ui'
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
    <main className="flex min-h-screen justify-center px-6 py-20">
      {invitationId ? (
        <InvitationFlow client={authClient} invitationId={invitationId} />
      ) : (
        <p>Invalid invitation link.</p>
      )}
    </main>
  )
}
