// ** import types

// ** import lib
import { AuthQueryProvider } from '@daveyplate/better-auth-tanstack'
import { AuthUIProviderTanstack } from '@daveyplate/better-auth-ui/tanstack'
import { Link, useRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// ** import utils
import { authClient } from '@/lib/auth-client'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
})

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const router = useRouter()

  return (
    <QueryClientProvider client={queryClient}>
      <AuthQueryProvider>
        <AuthUIProviderTanstack
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          authClient={authClient as any}
          navigate={(href) => router.navigate({ to: href })}
          replace={(href) => router.navigate({ to: href, replace: true })}
          Link={({ href, ...props }) => <Link to={href} {...props} />}
          social={{
            providers: ['google'],
          }}
          magicLink={true}
          account={{
            fields: ['image', 'name'],
          }}
        >
          {children}
        </AuthUIProviderTanstack>
      </AuthQueryProvider>
    </QueryClientProvider>
  )
}
