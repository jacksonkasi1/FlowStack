// ** import types

// ** import lib
import { AuthQueryProvider } from '@daveyplate/better-auth-tanstack'
import { AuthUIProviderTanstack } from '@daveyplate/better-auth-ui/tanstack'
import { Link, useRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from './components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import type { ReactNode } from 'react'

// ** import utils
import { authClient } from '@/lib/auth-client'

// ** import config
import { APP_URLS } from '@/config/urls'

// ** import rest-api
import { deleteAvatar, uploadAvatar } from '@/rest-api/storage'

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
    <ThemeProvider defaultTheme="light" storageKey="flowstack-ui-theme">
      <QueryClientProvider client={queryClient}>
        <AuthQueryProvider>
          <AuthUIProviderTanstack
            authClient={authClient as any}
            baseURL={APP_URLS.frontend}
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
            avatar={{
              upload: uploadAvatar,
              delete: deleteAvatar,
            }}
          >
            {children}
            <Toaster />
          </AuthUIProviderTanstack>
        </AuthQueryProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
