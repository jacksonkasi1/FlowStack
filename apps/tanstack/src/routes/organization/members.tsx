// ** import lib
import { createFileRoute } from '@tanstack/react-router'
import { OrganizationMembersCard } from '@daveyplate/better-auth-ui'

// ** import components
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@repo/auth-ui/guards/tanstack-router'

export const Route = createFileRoute('/organization/members')({
  component: OrganizationMembersPage,
})

function OrganizationMembersPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-lg py-8 px-4">
          <h1 className="text-xl font-semibold mb-6">Organization Members</h1>
          <OrganizationMembersCard />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
