# Authentication modes

Run `bun run setup` from the repository root. Choose Personal or Organization, then your frontend. For scripted setup use `bun run setup --mode personal --frontend react`.

The selected mode is stored in `packages/config/src/config/preset.ts`. Both clients and the API read it through `AUTH_MODE_CONFIG`; restart development servers or rebuild deployments after changing it.

Personal mode disables organization and onboarding plugins on the server as well as the corresponding UI. Organization tables and migration history remain in both presets. Normal authentication and email verification still apply. Do not remove the authentication guard when removing organization UI.

See [complete setup instructions](../getting-started/template-setup.md) for installation, optional frontend cleanup, and how to maintain existing clones.
