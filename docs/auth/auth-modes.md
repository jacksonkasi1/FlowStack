# Auth Modes

> **Level:** 🟢 Beginner | **Time:** ⏱️ 10 min | **Prerequisites:** [Quick Start](../getting-started/quickstart.md)

FlowStack supports two authentication modes. Choose the one that fits your use case.

---

## Quick Overview

| Mode | User Flow | Best For |
|------|-----------|----------|
| **Simple** | Signup → Dashboard | Personal apps, MVPs, single-user SaaS |
| **Organization** | Signup → Create Org → Dashboard | Team SaaS, B2B apps, multi-tenant |

**Default:** Organization mode (current setup)

---

## How to Switch Modes

### Option 1: Configuration Toggle (Recommended)

**One file change, instant switch:**

```ts
// packages/config/src/config/auth-mode.ts
export const AUTH_MODE_CONFIG: AuthModeConfig = {
  mode: "simple",        // ← Change this: "simple" or "organization"
  requireOrganization: false,
  enableOnboarding: false,
};
```

Then restart your dev server:

```bash
bun run dev
```

That's it! ✅

---

### Option 2: Full Removal (For Minimalists)

If you want to completely remove organization-related code from your codebase, follow these steps.

> [!WARNING]  
> This makes it harder to re-enable organizations later. Use Option 1 if you might need orgs in the future.

#### Step 1: Set Simple Mode Config

```ts
// packages/config/src/config/auth-mode.ts
export const AUTH_MODE_CONFIG: AuthModeConfig = {
  mode: "simple",
  requireOrganization: false,
  enableOnboarding: false,
};
```

#### Step 2: Remove Frontend Organization Files

Run these commands from your project root:

```bash
# Remove organization pages
rm apps/web/src/pages/organization/Settings.tsx
rm apps/web/src/pages/organization/Members.tsx
rm apps/web/src/pages/organization/AcceptInvite.tsx
rmdir apps/web/src/pages/organization

# Remove onboarding page (optional - can keep for future)
rm apps/web/src/pages/Onboarding.tsx
```

#### Step 3: Update App Routes

Edit `apps/web/src/App.tsx` and remove organization routes:

```diff
- import OrganizationSettingsPage from "@/pages/organization/Settings";
- import OrganizationMembersPage from "@/pages/organization/Members";
- import AcceptInvitationPage from "@/pages/organization/AcceptInvite";
- import Onboarding from "@/pages/Onboarding";

  // In Routes component, remove:
- <Route path="/onboarding" element={<Onboarding />} />
- <Route path="/onboarding/create-organization" element={<Onboarding step="createOrganization" />} />
- <Route path="/onboarding/invite-members" element={<Onboarding step="inviteMembers" />} />
- <Route path="/organization/settings" element={<OrganizationSettingsPage />} />
- <Route path="/organization/members" element={<OrganizationMembersPage />} />
- <Route path="/accept-invitation" element={<AcceptInvitationPage />} />
```

#### Step 4: Simplify Auth Client (Optional)

If you want a leaner auth client, edit `apps/web/src/lib/auth-client.ts`:

```diff
  import { createAuthClient } from "better-auth/react";
- import { organizationClient, adminClient } from "better-auth/client/plugins";
- import { onboardingClient } from "@repo/onboarding/client";
+ import { adminClient } from "better-auth/client/plugins";

  export const authClient = createAuthClient({
    baseURL: APP_URLS.api,
    plugins: [
-     organizationClient(),
      adminClient(),
-     onboardingClient(),
    ],
  });
```

#### Step 5: Remove RequireOnboarding Wrapper (Optional)

In `apps/web/src/App.tsx`:

```diff
- import { RequireOnboarding } from "@repo/auth-ui/guards/react-router";

  export default function App() {
    return (
-     <RequireOnboarding>
        <Routes>
          {/* ... routes ... */}
        </Routes>
-     </RequireOnboarding>
    );
  }
```

---

## Mode Comparison

### Simple Mode

```
┌──────────────┐     ┌─────────────┐
│  User Signs  │ ──► │  Dashboard  │
│     Up       │     │   Access    │
└──────────────┘     └─────────────┘
```

**What's enabled:**
- ✅ Email/password signup
- ✅ OAuth providers (Google, etc.)
- ✅ User settings page
- ❌ Organizations
- ❌ Team invitations
- ❌ Onboarding wizard

### Organization Mode

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌─────────────┐
│  User Signs  │ ──► │    Create    │ ──► │    Invite    │ ──► │  Dashboard  │
│     Up       │     │ Organization │     │   Members    │     │   Access    │
└──────────────┘     └──────────────┘     └──────────────┘     └─────────────┘
```

**What's enabled:**
- ✅ Email/password signup
- ✅ OAuth providers
- ✅ User settings page
- ✅ Multi-organization support
- ✅ Team invitations
- ✅ Organization settings
- ✅ Member management
- ✅ Role-based access

---

## Configuration Reference

### Full Config File

```ts
// packages/config/src/config/auth-mode.ts

export type AuthMode = "simple" | "organization";

export interface AuthModeConfig {
  mode: AuthMode;
  requireOrganization: boolean;
  enableOnboarding: boolean;
}

export const AUTH_MODE_CONFIG: AuthModeConfig = {
  // "simple" or "organization"
  mode: "organization",
  
  // Only applies in organization mode:
  // true = user MUST create/join org
  // false = orgs available but optional
  requireOrganization: true,
  
  // Enable onboarding wizard after signup
  enableOnboarding: true,
};
```

### Helper Functions

Use these in your code:

```ts
import { 
  isSimpleMode, 
  isOrganizationMode, 
  requiresOrganization,
  isOnboardingEnabled 
} from "@repo/config";

// Check mode
if (isSimpleMode()) {
  // Hide org features
}

// Conditional rendering
{isOrganizationMode() && <OrgSwitcher />}
```

---

## Switching Back to Organization Mode

If you used **Option 1 (config toggle)**, just change the config back:

```ts
export const AUTH_MODE_CONFIG: AuthModeConfig = {
  mode: "organization",
  requireOrganization: true,
  enableOnboarding: true,
};
```

If you used **Option 2 (full removal)**, you'll need to:

1. Restore deleted files from git:
   ```bash
   git checkout HEAD -- apps/web/src/pages/organization/
   git checkout HEAD -- apps/web/src/pages/Onboarding.tsx
   ```

2. Re-add routes in `App.tsx`

3. Re-add plugins to auth client

> [!TIP]
> This is why **Option 1 is recommended** – switching is trivial.

---

## Migration Notes

### For Existing Users (Simple → Organization)

If you switch an existing app to organization mode, existing users won't have organizations. You have two options:

**Option A: Force onboarding for existing users**

The system will automatically redirect org-less users to onboarding on their next login.

**Option B: Auto-create personal organizations**

Create a migration script:

```ts
// scripts/migrate-to-orgs.ts
import { db } from "@repo/db";
import { user, organization, member } from "@repo/db";

async function migrateUsersToOrgs() {
  const users = await db.select().from(user);
  
  for (const u of users) {
    // Check if user already has an org
    const existing = await db.select()
      .from(member)
      .where(eq(member.userId, u.id))
      .limit(1);
    
    if (existing.length === 0) {
      // Create personal org
      const orgId = crypto.randomUUID();
      await db.insert(organization).values({
        id: orgId,
        name: `${u.name}'s Workspace`,
        slug: `workspace-${u.id.slice(0, 8)}`,
      });
      
      await db.insert(member).values({
        id: crypto.randomUUID(),
        organizationId: orgId,
        userId: u.id,
        role: "owner",
      });
    }
  }
}
```

---

## FAQ

### Do I lose my database tables in simple mode?

**No.** The organization tables remain in your database – they're just not used. This makes switching back easy.

### Can users still access organization routes in simple mode?

The routes won't be rendered, but API endpoints still exist. For production, you may want to add backend guards that check `isSimpleMode()`.

### Should I remove the organization plugin from the backend?

**Not recommended.** The plugin has minimal overhead and keeping it means you can easily switch modes. If you really want to remove it, edit `packages/auth/src/auth.ts`.

---

## Related Docs

- [Onboarding System](./onboarding.md)
- [Organization Invitations](./organization-invitations.md)
- [Configuration Reference](./configuration.md)
