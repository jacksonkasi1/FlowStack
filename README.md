# FlowStack

A bun-based monorepo using Turborepo for managing multiple applications and shared packages.

## Structure

- `apps/` - Applications
  - `server` - Backend server
  - `web` - Frontend web application
- `packages/` - Shared packages
  - `shared` - Shared types and utilities
  - `logs` - Logging utility
  - `typescript-config` - Shared TypeScript configuration
  - `eslint-config` - Shared ESLint configuration

## Getting Started

### Prerequisites

- Node.js >= 18
- Bun 1.2.22

### Installation

```bash
bun install
```

### Development

```bash
bun run dev
```

This will start all apps in development mode.

### Building

```bash
bun run build
```

### Linting

```bash
bun run lint
```

### Type Checking

```bash
bun run check-types
```

## Package Manager

This monorepo uses Bun as the package manager. Make sure to use `bun` commands instead of `npm` or `yarn`.
