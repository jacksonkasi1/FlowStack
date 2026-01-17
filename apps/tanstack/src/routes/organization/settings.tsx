// ** import lib
import { createFileRoute } from '@tanstack/react-router'
import { OrganizationSettingsCards } from '@daveyplate/better-auth-ui'

// ** import components
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export const Route = createFileRoute('/organization/settings')({
  component: OrganizationSettingsPage,
})

function OrganizationSettingsPage() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="mx-auto max-w-lg py-8 px-4">
          <h1 className="text-xl font-semibold mb-6">Organization Settings</h1>
          <OrganizationSettingsCards />
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
