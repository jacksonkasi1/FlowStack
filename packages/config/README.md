# @repo/config

Shared types, configurations, and utilities used across FlowStack applications.

## Purpose

This package provides centralized configuration and type definitions that are reused across:
- `@repo/auth` - Backend authentication package
- `apps/web` - React web application
- `apps/tanstack` - TanStack Router application
- `apps/server` - Backend server

## What's Inside

### User Metadata Configuration

**File:** `src/config/user-metadata.ts`

Centralized configuration for additional user signup fields. Define custom fields once and they automatically appear in all signup forms.

```typescript
import { USER_METADATA_FIELDS, getAuthUserFields } from '@repo/config';
```

**To add a new field:**
1. Edit `src/config/user-metadata.ts`
2. Add entry to `USER_METADATA_FIELDS` array
3. Field automatically appears in frontend and backend

**Learn more:** [/docs/auth/user-metadata.md](../../docs/auth/user-metadata.md)

---

### Organization Configuration

**File:** `src/config/organization.ts`

Shared organization settings like logo upload config and custom roles.

```typescript
import { ORGANIZATION_LOGO, ORGANIZATION_ROLES } from '@repo/config';
```

**To configure:**
- `ORGANIZATION_LOGO` - logo dimensions and allowed extensions
- `ORGANIZATION_ROLES` - custom roles beyond default owner/admin/member

---

### UI Settings

**File:** `src/config/settings.ts`

Shared UI configuration like minimal card styles used across web and tanstack apps.

```typescript
import { minimalCardStyles } from '@repo/config';
```

---

### Shared Types

**File:** `src/types/index.ts`

Common TypeScript types and interfaces.

```typescript
import type { ApiResponse } from '@repo/config/types';
```

---

## Usage

Import from the package:

```typescript
// Default exports
import { USER_METADATA_FIELDS } from '@repo/config';

// Specific subpaths
import { getAuthUserFields } from '@repo/config';
import { minimalCardStyles } from '@repo/config';
import type { ApiResponse } from '@repo/config/types';
```

## Package Exports

Available import paths:
- `@repo/config` - Main exports
- `@repo/config/types` - Type definitions only
- `@repo/config/config/settings` - UI settings
- `@repo/config/config/user-metadata` - User metadata config
