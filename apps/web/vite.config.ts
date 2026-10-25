// ** import core packages
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from "path";

// Source maps are generated and uploaded only when all three Sentry build
// variables are present (CI release builds). They are "hidden" (no
// sourceMappingURL comment) and deleted after upload, so never served.
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN &&
  process.env.SENTRY_ORG &&
  process.env.SENTRY_PROJECT,
);

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Must stay last.
    uploadSourceMaps &&
      sentryVitePlugin({
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        authToken: process.env.SENTRY_AUTH_TOKEN,
        release: { name: process.env.SENTRY_RELEASE },
        sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
        telemetry: false,
      }),
  ],
  build: {
    sourcemap: uploadSourceMaps ? "hidden" : false,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  },
});
