// ** import lib
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { SignedIn, SignedOut, UserButton } from '@daveyplate/better-auth-ui'
import { useEffect } from 'react'

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
        <div className="flex min-h-screen flex-col">
          <header className="flex items-center justify-between border-b px-6 py-4">
            <h1 className="text-xl font-semibold">FlowStack</h1>
            <UserButton />
          </header>

          <main className="flex flex-1 items-center justify-center p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Welcome to FlowStack</h2>
              <p className="mt-2 text-gray-600">You are signed in.</p>
            </div>
          </main>
        </div>
      </SignedIn>
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
