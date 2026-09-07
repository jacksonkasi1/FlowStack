# Organization Invite Flow Recipe

> **Level:** 🟡 Intermediate | **Time:** ⏱️ 15 min

A complete example of implementing organization invitations.

---

## Overview

This recipe shows how to:
1. Send invitations to team members
2. Accept invitations on sign-up
3. Display pending invitations

---

## Sending Invitations

### Invite Form Component

**File:** `apps/web/src/components/InviteForm.tsx`

```tsx
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function InviteForm({ organizationId }: { organizationId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    try {
      await authClient.organization.inviteMember({
        organizationId,
        email,
        role: "member", // or "admin"
      });
      setStatus("sent");
      setEmail("");
    } catch (error) {
      setStatus("error");
      console.error("Failed to send invitation:", error);
    }
  };

  return (
    <form onSubmit={handleInvite}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email address"
        required
      />
      <button type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending..." : "Send Invite"}
      </button>
      {status === "sent" && <p>✅ Invitation sent!</p>}
      {status === "error" && <p>❌ Failed to send invitation</p>}
    </form>
  );
}
```

---

## Accepting Invitations

### Accept Invitation Page

**File:** `apps/web/src/pages/AcceptInvitation.tsx`

```tsx
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  const invitationId = searchParams.get("id");

  useEffect(() => {
    const acceptInvite = async () => {
      if (!invitationId) {
        setStatus("error");
        return;
      }

      try {
        await authClient.organization.acceptInvitation({
          invitationId,
        });
        setStatus("success");
        // Redirect to dashboard after 2 seconds
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (error) {
        setStatus("error");
        console.error("Failed to accept invitation:", error);
      }
    };

    acceptInvite();
  }, [invitationId, navigate]);

  if (status === "loading") {
    return <p>Accepting invitation...</p>;
  }

  if (status === "success") {
    return (
      <div>
        <h1>🎉 Welcome to the team!</h1>
        <p>Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <h1>❌ Invalid Invitation</h1>
      <p>This invitation may have expired or already been used.</p>
      <a href="/auth/sign-in">Go to Sign In</a>
    </div>
  );
}
```

---

## Displaying Pending Invitations

### Pending Invites List

```tsx
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface Invitation {
  id: string;
  email: string;
  role: string;
  createdAt: string;
}

export function PendingInvitations({ organizationId }: { organizationId: string }) {
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  useEffect(() => {
    const fetchInvitations = async () => {
      const { data } = await authClient.organization.listInvitations({
        organizationId,
      });
      if (data) {
        setInvitations(data);
      }
    };

    fetchInvitations();
  }, [organizationId]);

  if (invitations.length === 0) {
    return <p>No pending invitations</p>;
  }

  return (
    <ul>
      {invitations.map((invite) => (
        <li key={invite.id}>
          {invite.email} - {invite.role}
        </li>
      ))}
    </ul>
  );
}
```

---

## Route Configuration

```tsx
<Route path="/accept-invitation" element={<AcceptInvitation />} />
```

---

## 👉 Related

- [Organization Invitations Guide](../../auth/organization-invitations.md)
- [Onboarding System](../../auth/onboarding.md)
