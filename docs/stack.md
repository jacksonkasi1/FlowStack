# Core Stack (Defaults, Not Lock-in)

FlowStack is **stack-aware**, but not stack-locked.

These are the **default technologies** used and tested in this repository.
You can replace parts of the stack if you know what you're doing.

---

## Frontend

* **Next.js (App Router)** — primary frontend
* **Vite** — supported for non-Next frontend apps
* **TypeScript** — strict by default
* **Tailwind CSS** — styling foundation
* **shadcn/ui** — component primitives
* **tnks-data-table** — data-heavy tables

---

## Backend

* **Hono.js** — HTTP framework
* **Drizzle ORM** — database access
* **PostgreSQL** — primary database

---

## Auth & Access

* **Better Auth** — authentication core
* **Better Auth UI** — optional UI helpers
* **FlexAuth (RBAC)** — role & permission system

---

## Email

* **React Email** — email templates
* **ZeptoMail** — default email provider

---

## Storage

* **Cloudflare R2**
* **Amazon S3**
* **Google Cloud Storage (GCS)**

---

## Deployment

* **Google Cloud Run (GCR)** — primary deployment target
* **Docker** — first-class support

---

## Design Philosophy for the Stack

FlowStack chooses tools that are:

* explicit over magical
* composable over monolithic
* boring in production

The stack may evolve, but **the architecture does not depend on any single tool**.

---

## Why this stack?

These tools aren't here because they're "trendy".

They're here because:

- They **solve real problems** without abstractions
- They **work well together** without glue
- They **scale** from prototype to production
- They're **actively maintained**

If you want to understand **why** a specific choice was made, check the relevant package documentation or start a discussion.
