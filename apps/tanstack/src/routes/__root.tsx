// ** import types

// ** import lib
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

// ** import components
import { RequireOnboarding } from '@repo/auth-ui/guards/tanstack-router'
import { FullPageLoading } from '@/components/ui/full-page-loading'

// ** import utils
import { Providers } from '../providers'
import { captureException } from '../lib/monitoring'
import { authClient } from '../lib/auth-client'
import { EMAIL_VERIFICATION_CONFIG } from '../config/email-verification'
import appCss from '../styles.css?url'
import { useEffect } from 'react'
import type { ErrorComponentProps } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'FlowStack',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),

  component: RootComponent,
  shellComponent: RootDocument,
  errorComponent: RootError,
})

function RootError({ error, reset }: ErrorComponentProps) {
  // SSR has no effects, so server-side render errors are reported here.
  if (typeof window === 'undefined') captureException(error)
  useEffect(() => {
    captureException(error)
  }, [error])
  return (
    <div
      role="alert"
      className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center"
    >
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        The error has been recorded. Try again, or reload the page.
      </p>
      <button
        type="button"
        className="rounded-md border px-4 py-2 text-sm"
        onClick={reset}
      >
        Try again
      </button>
    </div>
  )
}

function RootComponent() {
  return (
    <Providers>
      <RequireOnboarding
        authClient={authClient as any}
        emailVerificationMode={EMAIL_VERIFICATION_CONFIG.mode}
        emailVerificationRedirectPath={EMAIL_VERIFICATION_CONFIG.redirectPath}
        emailVerificationBypassRoutes={EMAIL_VERIFICATION_CONFIG.bypassRoutes}
        loadingComponent={<FullPageLoading />}
      >
        <Outlet />
      </RequireOnboarding>
    </Providers>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="initial-scale=1, viewport-fit=cover, width=device-width"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="oklch(1 0 0)"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="oklch(0.145 0 0)"
        />
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
