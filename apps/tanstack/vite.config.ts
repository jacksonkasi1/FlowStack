import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { sentryTanstackStart } from '@sentry/tanstackstart-react/vite'

// Source maps are generated and uploaded only when all three Sentry build
// variables are present (CI release builds). The plugin deletes the .map files
// after upload so they are never served publicly.
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT,
)

const config = defineConfig({
  plugins: [
    devtools(),
    nitro(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    // Must stay last.
    uploadSourceMaps &&
      sentryTanstackStart({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: process.env.SENTRY_RELEASE },
        telemetry: false,
      }),
  ],
})

export default config
