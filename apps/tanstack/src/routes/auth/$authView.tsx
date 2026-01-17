// ** import lib

import { AuthView } from '@daveyplate/better-auth-ui'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/auth/$authView')({
  component: RouteComponent,
})

function RouteComponent() {
  const { authView } = Route.useParams()

  // Only use absolute URL on client-side to avoid SSR errors
  const redirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/dashboard`
      : '/dashboard'

  return (
    <main className="container mx-auto flex min-h-screen grow flex-col items-center justify-center gap-3 self-center p-4 md:p-6">
      <AuthView pathname={authView} redirectTo={redirectTo} />
    </main>
  )
}
