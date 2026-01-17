// ** import lib
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { SignedIn, SignedOut } from '@daveyplate/better-auth-ui'
import { useEffect } from 'react'

// ** import components
import { AppLayout } from '@/components/layout/AppLayout'

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  return (
    <>
      <SignedOut>
        <RedirectTo to="/auth/sign-in" />
      </SignedOut>

      <SignedIn>
        <AppLayout>
          <div className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Welcome to FlowStack</h2>
              <p className="mt-2 text-gray-600">You are signed in.</p>
            </div>
          </div>
        </AppLayout>
      </SignedIn>
    </>
  )
}

function RedirectTo({ to }: { to: string }) {
  const router = useRouter()

  useEffect(() => {
    router.navigate({ to, replace: true } as any)
  }, [router, to])

  return null
}
