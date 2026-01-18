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
import {
  getOrganizationProviderConfig,
  createLogoUploadHandler,
  createLogoDeleteHandler,
} from '@/config/organization'

// ** import rest-api
import { deleteAvatar, uploadAvatar } from '@/rest-api/storage'
import { getUploadUrl } from '@/rest-api/storage/get-upload-url'
import { deleteFile } from '@/rest-api/storage/delete-file'

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

  const logoUploadHandler = createLogoUploadHandler(getUploadUrl)
  const logoDeleteHandler = createLogoDeleteHandler(deleteFile)

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
            {...getOrganizationProviderConfig({
              logoUpload: logoUploadHandler,
              logoDelete: logoDeleteHandler,
            })}
          >
            {children}
            <Toaster />
          </AuthUIProviderTanstack>
        </AuthQueryProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
