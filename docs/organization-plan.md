# Organization Feature Plan

## Overview

This document outlines the plan for implementing organization/multi-tenancy features using Better Auth's organization plugin and `@daveyplate/better-auth-ui` components.

## References

- [Better Auth Organization Documentation](https://better-auth.com/docs/plugins/organization)
- [Better Auth UI Organization Components](https://better-auth-ui.com/advanced/organizations)
- [Organization Settings Cards](https://better-auth-ui.com/components/organization-settings-cards)
- [Organization Members Card](https://better-auth-ui.com/components/organization-members-card)
- [Accept Invitation Card](https://better-auth-ui.com/components/accept-invitation-card)
- [Additional Fields for Signup](https://better-auth-ui.com/advanced/additional-fields)

---

## Features to Implement

### 1. Organization Creation with Additional Fields

During signup, users can create an organization with additional fields.

**Better Auth UI Configuration:**

```tsx
<AuthUIProvider
  authClient={authClient}
  additionalFields={{
    companyName: {
      label: "Company Name",
      placeholder: "Your company name",
      description: "Enter your company name",
      required: true,
      type: "string",
    },
    role: {
      label: "Your Role",
      placeholder: "e.g., Developer, Manager",
      description: "Your role in the organization",
      required: true,
      type: "string",
    },
    companySize: {
      label: "Company Size",
      description: "Select your company size",
      required: false,
      type: "select",
      options: [
        { label: "1-10", value: "1-10" },
        { label: "11-50", value: "11-50" },
        { label: "51-200", value: "51-200" },
        { label: "200+", value: "200+" },
      ],
    },
  }}
  signUp={{
    fields: ["companyName", "role", "companySize"],
  }}
>
  {children}
</AuthUIProvider>
```

**Database Schema Extensions:**

- Add `companyName`, `role`, `companySize` fields to organization table
- Or create separate `organization_profile` table

---

### 2. Organization Settings Page

Use `<OrganizationSettingsCards />` for comprehensive settings management.

**Components Included:**

- Organization Logo Card (upload/delete)
- Organization Name Card
- Organization Slug Card
- Delete Organization Card (owner only)

**Usage:**

```tsx
import { OrganizationSettingsCards } from "@daveyplate/better-auth-ui";

export function OrganizationSettingsPage() {
  return <OrganizationSettingsCards />;
}
```

**Configuration:**

```tsx
<AuthUIProvider
  authClient={authClient}
  organization={{
    logo: {
      upload: async (file) => {
        // Your upload logic
        return uploadedUrl;
      },
      delete: async (url) => {
        // Optional: clean up your storage/CDN on delete
        await myCdn.delete(url);
      },
      size: 256,
      extension: "png",
    },
    customRoles: [
      { role: "developer", label: "Developer" },
      { role: "viewer", label: "Viewer" },
    ],
  }}
>
  {children}
</AuthUIProvider>
```

---

### 3. Organization Members Management

Use `<OrganizationMembersCard />` for member management.

**Features:**

- List all members
- Update member roles
- Remove members
- View member details

**Usage:**

```tsx
import { OrganizationMembersCard } from "@daveyplate/better-auth-ui";

<OrganizationMembersCard />;
```

---

### 4. Invite Members Flow

Use `<OrganizationInvitationsCard />` for invitation management.

**Flow:**

1. Owner/Admin sends invitation via email
2. Recipient receives invitation email
3. User clicks link to accept/reject
4. User becomes member with assigned role

**Accept Invitation:**

```tsx
import { AcceptInvitationCard } from "@daveyplate/better-auth-ui";

<AcceptInvitationCard />;
```

---

### 5. Organization Switcher

Use `<OrganizationSwitcher />` to switch between organizations.

**Usage:**

```tsx
import { OrganizationSwitcher } from "@daveyplate/better-auth-ui";

<OrganizationSwitcher />;
```

---

### 6. Organization List

Use `<OrganizationsCard />` to list all user's organizations.

**Usage:**

```tsx
import { OrganizationsCard } from "@daveyplate/better-auth-ui";

<OrganizationsCard />;
```

---

## Role-Based Access Control

### Built-in Roles

| Role       | Permissions                                              |
| ---------- | -------------------------------------------------------- |
| **Owner**  | Full control, delete org, transfer ownership, manage all |
| **Admin**  | Manage settings, invite/remove members, update roles     |
| **Member** | Basic access, cannot manage settings or members          |

### Custom Roles

Define additional roles in AuthUIProvider:

```tsx
organization={{
  customRoles: [
    { role: "developer", label: "Developer" },
    { role: "viewer", label: "View Only" },
    { role: "billing", label: "Billing Administrator" }
  ]
}}
```

---

## Implementation Tasks

### Phase 1: Database & Backend

- [ ] Update database schema for organizations
- [ ] Enable Better Auth organization plugin
- [ ] Configure organization plugin with custom roles
- [ ] Set up email invitation flow

### Phase 2: Frontend - Providers

- [ ] Configure AuthUIProvider with organization settings
- [ ] Add additional fields for signup
- [ ] Configure logo upload handler
- [ ] Add custom roles configuration

### Phase 3: Frontend - Pages

- [ ] Create organization settings page
- [ ] Create organization members page
- [ ] Create accept invitation page
- [ ] Add organization switcher to layout

### Phase 4: Testing & Polish

- [ ] Test invitation flow
- [ ] Test role-based permissions
- [ ] Test organization switching
- [ ] Test logo upload/delete
- [ ] Update documentation

---

## File Structure

```
apps/
  web/
    src/
      pages/
        organization/
          settings.tsx      # OrganizationSettingsCards
          members.tsx       # OrganizationMembersCard
          accept-invite.tsx # AcceptInvitationCard
      components/
        layout/
          AppLayout.tsx     # Add OrganizationSwitcher
  tanstack/
    src/
      routes/
        organization/
          $organizationView.tsx  # Organization settings
          members.tsx            # Members management
      components/
        organization-switcher.tsx
packages/
  db/
    src/
      schema/
        organization.ts     # Organization tables
```

---

## API Reference

### Better Auth Organization Methods

```ts
// Create organization
await authClient.organization.create({
  name: string,
  slug?: string,
  logo?: string
})

// Add member
await authClient.organization.addMember({
  organizationId: string,
  userId: string,
  role: string
})

// Remove member
await authClient.organization.removeMember({
  organizationId: string,
  userId: string
})

// Update member role
await authClient.organization.updateMember({
  organizationId: string,
  userId: string,
  role: string
})

// Send invitation
await authClient.organization.sendInvitation({
  organizationId: string,
  email: string,
  role: string
})

// Accept invitation
await authClient.organization.acceptInvitation({
  invitationId: string
})

// Switch active organization
await authClient.organization.setActive({
  organizationId: string
})
```

### Organization Hooks

```tsx
import { useContext } from "react";
import { AuthUIContext } from "@daveyplate/better-auth-ui";

function MyComponent() {
  const { hooks } = useContext(AuthUIContext);

  // Get active organization
  const { data: activeOrg } = hooks.useActiveOrganization();

  // List all organizations
  const { data: organizations } = hooks.useListOrganizations();

  // Check permissions
  const { data: hasPermission } = hooks.useHasPermission({
    permissions: {
      organization: ["update", "delete"],
      member: ["create", "delete"],
    },
  });

  return <div>Current org: {activeOrg?.name}</div>;
}
```

---

## Security Considerations

1. **Permission Validation**: All actions are permission-checked server-side
2. **Invitation Security**: Invitations include secure tokens with expiration
3. **Data Isolation**: Organization data is properly isolated per organization
4. **Session Freshness**: Some actions require fresh authentication
5. **Audit Trail**: Consider logging organization actions

---

## Next Steps

1. Enable organization plugin in Better Auth configuration
2. Run database migrations for organization tables
3. Configure AuthUIProvider with organization settings
4. Create organization pages using Better Auth UI components
5. Test the complete flow
