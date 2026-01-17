// ** import lib

import { AuthView } from '@daveyplate/better-auth-ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/$authView')({
  component: RouteComponent,
})

function RouteComponent() {
  const { authView } = Route.useParams()

  // Use relative path - AuthUIProvider's navigate function handles routing
  const redirectTo = '/dashboard'

  return (
    <main className="container mx-auto flex min-h-screen grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView pathname={authView} redirectTo={redirectTo} />
    </main>
  )
}
