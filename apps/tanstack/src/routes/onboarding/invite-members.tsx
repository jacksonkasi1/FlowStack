import { isOrganizationMode } from '@repo/config'
import { redirect } from '@tanstack/react-router'
// ** import lib
import { createFileRoute } from '@tanstack/react-router'

// ** import pages
import OnboardingPage from './-onboarding-page'

export const Route = createFileRoute('/onboarding/invite-members')({
  beforeLoad: () => {
    if (!isOrganizationMode()) throw redirect({ to: '/dashboard' })
  },
  component: () => <OnboardingPage step="inviteMembers" />,
})
