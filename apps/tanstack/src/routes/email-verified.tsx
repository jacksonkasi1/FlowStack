// ** import core packages
import { useCallback } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { VerificationSuccess } from '@repo/auth-ui'
import { authClient } from '@/lib/auth-client'

export const Route = createFileRoute('/email-verified')({
  component: EmailVerified,
})
function EmailVerified() {
  const routerNavigate = useNavigate()
  const navigate = useCallback(
    (path: string) => {
      void routerNavigate({ to: path, replace: true })
    },
    [routerNavigate],
  )
  return <VerificationSuccess client={authClient} navigate={navigate} />
}
