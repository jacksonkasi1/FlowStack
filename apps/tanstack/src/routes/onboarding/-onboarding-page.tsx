// ** import core packages
import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'

// ** import components
import { OnboardingWizard } from '@repo/auth-ui'

// ** import utils
import { authClient } from '@/lib/auth-client'
import { onboardingApi } from '@/rest-api/onboarding'

export default function OnboardingPage({
  step,
}: {
  step?: 'createOrganization' | 'inviteMembers'
}) {
  const routerNavigate = useNavigate()
  const navigate = useCallback(
    (path: string) => {
      void routerNavigate({ to: path, replace: true })
    },
    [routerNavigate],
  )
  return (
    <OnboardingWizard
      step={step}
      client={authClient}
      api={onboardingApi}
      navigate={navigate}
    />
  )
}
