// ** import lib
import { createFileRoute } from '@tanstack/react-router'

// ** import components
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Welcome to FlowStack</h2>
            <p className="mt-2 text-muted-foreground">You are signed in.</p>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
