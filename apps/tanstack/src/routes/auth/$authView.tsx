// ** import lib

import { AuthView } from '@daveyplate/better-auth-ui'
import { createFileRoute } from '@tanstack/react-router'

// ** import config
import { AUTH_REDIRECTS } from '@/config/redirects'
import { AuthShell, authViewClassNames } from '@repo/auth-ui'

export const Route = createFileRoute('/auth/$authView')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirectTo?: string } => ({
    redirectTo:
      typeof search.redirectTo === 'string' &&
      search.redirectTo.startsWith('/') &&
      !search.redirectTo.startsWith('//')
        ? search.redirectTo
        : undefined,
  }),
  component: RouteComponent,
})

function RouteComponent() {
  const { authView } = Route.useParams()

  // Use relative path - AuthUIProvider's navigate function handles routing
  const search = Route.useSearch()
  const redirectTo = search.redirectTo || AUTH_REDIRECTS.afterLogin

  return (
    <AuthShell
      stage={
        authView === 'sign-up'
          ? 'sign-up'
          : authView.includes('password')
            ? 'reset'
            : 'sign-in'
      }
    >
      <AuthView
        pathname={authView}
        redirectTo={redirectTo}
        classNames={authViewClassNames}
      />
    </AuthShell>
  )
}
