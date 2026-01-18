# Onboarding System

Guide for implementing and customizing the multi-step onboarding flow.

## Overview

The onboarding system uses the custom `@repo/onboarding` plugin to guide new users through setup steps before accessing the application. Features include:

- Multi-step wizard with configurable order
- Required and optional steps
- Step completion validation
- Automatic redirect enforcement
- Database-backed state tracking

## Architecture

### Components

1. **Backend Plugin** (`@repo/onboarding`) - Better Auth plugin for step management
2. **Frontend Guard** (`RequireOnboarding`) - Route protection component
3. **Onboarding Pages** (`apps/web/src/pages/Onboarding.tsx`) - UI for each step

---

## Backend Setup

### 1. Install Package

The onboarding plugin is a custom package in the monorepo:

```
packages/onboarding/
├── src/
│   ├── index.ts       # Main plugin
│   ├── adapter.ts     # Database adapter
│   ├── client.ts      # Frontend hooks
│   ├── types.ts       # TypeScript types
│   └── utils.ts       # Helper functions
└── package.json
```

### 2. Configure Plugin

**File:** `packages/auth/src/auth.ts`

```ts
import { onboarding, createOnboardingStep } from "@repo/onboarding";

export const auth = betterAuth({
  plugins: [
    // ... other plugins
    onboarding({
      steps: {
        // Step 1: Create organization (required)
        createOrganization: createOnboardingStep({
          input: z.object({
            organizationName: z.string().min(2).max(100),
            logo: z.string().optional(),
          }),
          async handler(ctx) {
            const { organizationName, logo } = ctx.body;
            const session = ctx.context.session;

            // Create organization
            const orgId = crypto.randomUUID();
            const slug = generateOrganizationSlug(organizationName);

            await db.insert(organizationTable).values({
              id: orgId,
              name: organizationName,
              slug,
              logo: logo || null,
              createdAt: new Date(),
            });

            // Add user as owner
            await db.insert(memberTable).values({
              id: crypto.randomUUID(),
              organizationId: orgId,
              userId: session.user.id,
              role: CREATOR_ROLE,
              createdAt: new Date(),
            });

            // Set as active organization
            await db.update(sessionTable)
              .set({ activeOrganizationId: orgId })
              .where(eq(sessionTable.id, session.session.id));

            return { organizationId: orgId, organizationName, slug };
          },
          required: true,
          once: true,
          order: 1,
        }),

        // Step 2: Invite members (optional)
        inviteMembers: createOnboardingStep({
          input: z.object({
            emails: z.array(z.string().email()).optional(),
          }),
          async handler(ctx) {
            const { emails } = ctx.body;
            // Handle invitations
            return { invited: emails || [] };
          },
          required: false,
          once: true,
          order: 2,
        }),
      },
      completionStep: "inviteMembers", // Last step in the flow
      onboardingPath: "/onboarding",
    }),
  ],
});
```

### Step Configuration Options

```ts
createOnboardingStep({
  input: ZodSchema,           // Validation schema for request body
  handler: async (ctx) => {}, // Step logic
  required: boolean,          // Must complete to finish onboarding
  once: boolean,              // Can only complete once (default: true)
  order: number,              // Step order (lower = earlier)
})
```

### Plugin Options

```ts
onboarding({
  steps: {},                  // Map of step definitions
  completionStep: "stepId",   // Step that marks onboarding complete
  onboardingPath: "/path",    // Frontend onboarding route (default: "/onboarding")
  autoEnableOnSignUp: true,   // Auto-enable for new users (default: true)
})
```

---

## Database Schema

The plugin adds the following fields to the `user` table:

```sql
shouldOnboard              BOOLEAN DEFAULT false
currentOnboardingStep      TEXT
completedOnboardingSteps   TEXT -- JSON array of step IDs
```

**Migration:** `packages/db/drizzle/0005_awesome_sentinel.sql`

---

## Frontend Setup

### 1. Onboarding Page Component

**File:** `apps/web/src/pages/Onboarding.tsx`

```tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

interface OnboardingProps {
  step?: "createOrganization" | "inviteMembers";
}

export default function Onboarding({ step }: OnboardingProps) {
  const navigate = useNavigate();

  // Check onboarding status on mount
  useEffect(() => {
    const checkStatus = async () => {
      const { data } = await authClient.onboarding.status();
      
      if (!data?.shouldOnboard) {
        // User doesn't need onboarding
        navigate("/dashboard", { replace: true });
      }
    };
    
    checkStatus();
  }, [navigate]);

  const handleComplete = async (stepData: any) => {
    try {
      const result = await authClient.onboarding.completeStep(
        step || "createOrganization",
        stepData
      );

      // Navigate to next step or dashboard
      if (result.data?.currentStep) {
        const nextStepPath = `/onboarding/${result.data.currentStep}`;
        navigate(nextStepPath);
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Failed to complete step:", error);
    }
  };

  // Render step-specific UI
  if (step === "createOrganization") {
    return <CreateOrganizationForm onSubmit={handleComplete} />;
  }

  if (step === "inviteMembers") {
    return <InviteMembersForm onSubmit={handleComplete} />;
  }

  return <div>Loading...</div>;
}
```

### 2. Route Configuration

**File:** `apps/web/src/App.tsx`

```tsx
<Route path="/onboarding" element={<Onboarding />} />
<Route path="/onboarding/create-organization" element={<Onboarding step="createOrganization" />} />
<Route path="/onboarding/invite-members" element={<Onboarding step="inviteMembers" />} />
```

### 3. RequireOnboarding Guard

**File:** `apps/web/src/components/auth/RequireOnboarding.tsx`

Wrap your routes to enforce onboarding:

```tsx
<RequireOnboarding>
  <Routes>
    {/* All protected routes */}
  </Routes>
</RequireOnboarding>
```

The guard:
- Checks `session.user.shouldOnboard` on route changes
- Redirects to `/onboarding/{currentStep}` if incomplete
- Bypasses check for auth/onboarding routes

---

## Client API

The frontend client provides hooks for onboarding:

```tsx
import { authClient } from "@/lib/auth-client";

// Check onboarding status
const { data } = await authClient.onboarding.status();
// Returns: { shouldOnboard, currentStep, completedSteps, stepOrder }

// Complete a step
const result = await authClient.onboarding.completeStep("stepId", { data });
// Returns: { completedSteps, currentStep, data }

// Skip an optional step
const result = await authClient.onboarding.skipStep("stepId");

// Check if step is accessible
const canAccess = await authClient.onboarding.canAccessStep("stepId");
```

---

## Invitation Integration

The onboarding system integrates with organization invitations:

### Skip Onboarding for Invited Users

When users sign up via invitation, onboarding is automatically skipped:

1. **Hook in organizationPlugin:**
   ```ts
   organizationHooks: {
     afterAcceptInvitation: async ({ user }) => {
       await db.update(userTable)
         .set({ shouldOnboard: false, currentOnboardingStep: null })
         .where(eq(userTable.id, user.id));
     },
   }
   ```

2. **Session Hook Sync:**
   ```ts
   hooks: {
     after: async (ctx) => {
       // If user HAS org membership → clear onboarding
       if (memberships.length > 0 && user.shouldOnboard) {
         await db.update(userTable)
           .set({ shouldOnboard: false, currentOnboardingStep: null })
           .where(eq(userTable.id, user.id));
       }
     }
   }
   ```

See [Organization Invitations](./organization-invitations.md) for details.

---

## Customization

### Add a New Step

1. **Define step in auth.ts:**
   ```ts
   steps: {
     // ... existing steps
     setupBilling: createOnboardingStep({
       input: z.object({ plan: z.enum(["free", "pro"]) }),
       async handler(ctx) {
         // Setup billing
         return { plan: ctx.body.plan };
       },
       required: false,
       order: 3,
     }),
   }
   ```

2. **Update completion step:**
   ```ts
   completionStep: "setupBilling", // Last step
   ```

3. **Add frontend route:**
   ```tsx
   <Route path="/onboarding/setup-billing" element={<Onboarding step="setupBilling" />} />
   ```

4. **Create step UI:**
   ```tsx
   if (step === "setupBilling") {
     return <BillingSetupForm onSubmit={handleComplete} />;
   }
   ```

### Change Step Order

Update the `order` property:

```ts
createOrganization: createOnboardingStep({
  order: 1, // ← First step
  // ...
}),
inviteMembers: createOnboardingStep({
  order: 2, // ← Second step
  // ...
}),
```

### Make Step Optional/Skippable

Set `required: false`:

```ts
inviteMembers: createOnboardingStep({
  required: false, // ← Users can skip
  // ...
}),
```

Then add skip button in UI:

```tsx
<Button onClick={() => authClient.onboarding.skipStep("inviteMembers")}>
  Skip for now
</Button>
```

### Disable Auto-Enable for New Users

```ts
onboarding({
  autoEnableOnSignUp: false, // Don't force onboarding for new signups
  // ...
})
```

Or conditionally enable:

```ts
onboarding({
  autoEnableOnSignUp: async (ctx) => {
    // Custom logic to determine if user needs onboarding
    return shouldEnableOnboarding(ctx);
  },
  // ...
})
```

---

## User Flows

### 1. New User Signup (Regular)

1. User signs up → `shouldOnboard = true`
2. User redirected to `/onboarding/create-organization`
3. User completes step → moves to next step
4. User completes final step → `shouldOnboard = false`
5. User can access dashboard ✅

### 2. New User via Invitation

1. User signs up via invitation link
2. `shouldOnboard = true` initially
3. User accepts invitation
4. `afterAcceptInvitation` hook sets `shouldOnboard = false`
5. User can access dashboard immediately ✅

### 3. Existing User (Onboarding Already Complete)

1. User logs in
2. `shouldOnboard = false` in session
3. `RequireOnboarding` allows access
4. User goes to dashboard ✅

---

## Troubleshooting

### User stuck in onboarding loop

**Symptom:** Keeps redirecting to onboarding after completion

**Solutions:**
1. Check `shouldOnboard` is set to `false` in database
2. Verify completion step matches last step ID
3. Clear session and re-login
4. Check `RequireOnboarding` bypass routes include `/onboarding`

### Step validation failing

**Symptom:** "Validation error" on step submission

**Solutions:**
1. Check Zod schema matches form data
2. Verify required fields are included
3. Check console for detailed validation errors
4. Ensure request body format matches `input` schema

### Cannot access step

**Symptom:** "Step not accessible" error

**Solutions:**
1. Check step hasn't been completed already (`once: true`)
2. Verify previous required steps are complete
3. Check step order is correct
4. Ensure step exists in plugin configuration

---

## API Endpoints

The plugin creates the following endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/onboarding/status` | GET | Get user's onboarding status |
| `/onboarding/should-onboard` | GET | Check if user needs onboarding |
| `/onboarding/step/{step-name}` | POST | Complete a step |
| `/onboarding/skip-step/{step-name}` | POST | Skip optional step |
| `/onboarding/can-access-step/{step-name}` | GET | Check step accessibility |

All endpoints require authentication via `sessionMiddleware`.
