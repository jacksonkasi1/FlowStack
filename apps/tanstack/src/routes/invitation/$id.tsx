// ** import lib
import { createFileRoute } from '@tanstack/react-router'
import { AcceptInvitationCard } from '@daveyplate/better-auth-ui'

// ** import components
import { ProtectedRoute } from '@repo/auth-ui/guards/tanstack-router'

export const Route = createFileRoute('/invitation/$id')({
  component: AcceptInvitationPage,
})

function AcceptInvitationPage() {
  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-md py-8 px-4">
        <h1 className="text-xl font-semibold mb-6 text-center">
          Accept Invitation
        </h1>
        <AcceptInvitationCard />
      </div>
    </ProtectedRoute>
  )
}
