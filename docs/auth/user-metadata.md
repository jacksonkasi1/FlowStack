# User Metadata Configuration

> **Level:** 🔴 Advanced | **Time:** ⏱️ 15 min | **Prerequisites:** [Configuration](./configuration.md)

This guide explains how to configure additional user fields that are captured during signup.

---

## What You'll Learn

- ✅ Add custom fields to user signup
- ✅ Configure metadata storage
- ✅ Use centralized user field configuration

---

## Overview

FlowStack uses a centralized configuration for user metadata fields. Instead of adding columns to the database for each custom field, all additional data is stored in a flexible `metadata` JSON column.

**Configuration Location:** `packages/config/src/config/user-metadata.ts`

## Adding a New Field

1. Open `packages/config/src/config/user-metadata.ts`
2. Add your field to the `USER_METADATA_FIELDS` array:

```typescript
export const USER_METADATA_FIELDS: UserMetadataField[] = [
  // Existing field
  {
    key: "organizationName",
    label: "Organization Name",
    placeholder: "Enter your organization name",
    description: "This will be your workspace name",
    required: true,
    type: "string",
    createsOrganization: true,
  },
  // Add your new field
  {
    key: "companySize",
    label: "Company Size",
    placeholder: "e.g., 1-10, 11-50, 50+",
    required: false,
    type: "string",
  },
];
```

3. The field will automatically appear in:
   - Backend auth config (`additionalFields`)
   - Frontend signup forms (web and tanstack apps)

## Field Options

| Property             | Type                              | Required | Description                                 |
| -------------------- | --------------------------------- | -------- | ------------------------------------------- |
| `key`                | `string`                          | Yes      | Unique identifier stored in metadata JSON   |
| `label`              | `string`                          | Yes      | Display label for the form                  |
| `placeholder`        | `string`                          | No       | Placeholder text for the input              |
| `description`        | `string`                          | No       | Helper text shown below the input           |
| `required`           | `boolean`                         | No       | Whether the field is required (default: false) |
| `type`               | `"string" \| "number" \| "boolean"` | No       | Field data type (default: "string")         |
| `createsOrganization`| `boolean`                         | No       | If true, triggers organization creation on signup |
| `returned`           | `boolean`                         | No       | Whether to return in API responses (default: false) |

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  @repo/config/src/config/user-metadata.ts                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  USER_METADATA_FIELDS = [{ key, label, ... }]       │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
   │  @repo/auth   │ │   apps/web    │ │ apps/tanstack │
   │ additionalFields│ │ signup form  │ │  signup form  │
   └───────────────┘ └───────────────┘ └───────────────┘
```

## API Reference

### `getAuthUserFields()`

Returns field configuration for Better Auth's `user.additionalFields`:

```typescript
import { getAuthUserFields } from "@repo/config";

const auth = betterAuth({
  user: {
    additionalFields: getAuthUserFields(),
  },
});
```

### `getUIUserFields()`

Returns field configuration for AuthUIProvider:

```typescript
import { getUIUserFields } from "@repo/config";

const additionalFields = getUIUserFields();
```

### `getOrganizationCreationFields()`

Returns keys of fields that trigger organization creation:

```typescript
import { getOrganizationCreationFields } from "@repo/config";

const orgFields = getOrganizationCreationFields();
// Returns: ["organizationName"]
```
