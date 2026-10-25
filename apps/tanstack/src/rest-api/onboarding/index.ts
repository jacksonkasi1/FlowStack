// ** import types
import type { OnboardingApi, WizardStatus } from '@repo/auth-ui'

// ** import config
import axios from '@/config/axios'

export const onboardingApi: OnboardingApi = {
  status: async () =>
    (
      await axios.get<WizardStatus>('/api/auth/onboarding/status', {
        timeout: 12000,
      })
    ).data,
  submit: async (endpoint, data) =>
    (
      await axios.post(`/api/auth/onboarding/${endpoint}`, data, {
        timeout: 25000,
      })
    ).data,
}
