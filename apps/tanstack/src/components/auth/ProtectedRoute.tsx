// ** import types
import type { ReactNode } from 'react'

// ** import lib
import { SignedIn, SignedOut } from '@daveyplate/better-auth-ui'
import { useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  redirectTo = '/auth/sign-in',
}: ProtectedRouteProps) {
  return (
    <>
      <SignedOut>
        <RedirectTo to={redirectTo} />
      </SignedOut>

      <SignedIn>{children}</SignedIn>
    </>
  )
}

function RedirectTo({ to }: { to: string }) {
  const router = useRouter()

  useEffect(() => {
    router.navigate({ to, replace: true })
  }, [router, to])

  return null
}
