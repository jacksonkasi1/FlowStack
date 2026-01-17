// ** import lib
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { SignedIn, SignedOut } from '@daveyplate/better-auth-ui'
import { useEffect } from 'react'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <>
      <SignedIn>
        <RedirectTo to="/dashboard" />
      </SignedIn>
      <SignedOut>
        <RedirectTo to="/auth/sign-in" />
      </SignedOut>
    </>
  )
}

function RedirectTo({ to }: { to: string }) {
  const router = useRouter()

  useEffect(() => {
     
    router.navigate({ to: to as any, replace: true })
  }, [router, to])

  return null
}
