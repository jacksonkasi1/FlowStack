# Quick Start

> **Level:** 🟢 Beginner | **Time:** ⏱️ 5 min | **Prerequisites:** [Prerequisites](./prerequisites.md)

Get FlowStack running in 5 minutes. By the end, you'll have a working authentication system.

---

## What You'll Have

After completing this guide:
- ✅ FlowStack running locally
- ✅ Working sign-up/sign-in pages
- ✅ Database with auth tables
- ✅ Protected dashboard route

---

## Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/FlowStack.git
cd FlowStack
```

---

## Step 2: Install Dependencies

```bash
bun install
```

> **Note:** This installs dependencies for all packages in the monorepo.

---

## Step 3: Set Up Environment Variables

Copy the example environment files:

```bash
# Root env
cp .env.example .env

# Frontend env
cp apps/web/.env.example apps/web/.env

# Server env (if using)
cp apps/server/.env.example apps/server/.env
```

### Required Variables

Edit `.env` and set:

```env
# Database connection
DATABASE_URL=postgresql://user:password@localhost:5432/flowstack

# Auth secret (generate a random string)
BETTER_AUTH_SECRET=your-secret-key-minimum-32-chars

# URLs
BETTER_AUTH_URL=http://localhost:8080
FRONTEND_URL=http://localhost:5173
```

> **Tip:** Generate a secret: `openssl rand -base64 32`

---

## Step 4: Set Up the Database

Run database migrations:

```bash
bun run db:push
```

This creates all necessary tables for authentication, sessions, and organizations.

---

## Step 5: Start the Development Server

```bash
bun run dev
```

This starts:
- **Frontend:** http://localhost:5173
- **API:** http://localhost:8080

---

## 🎉 Verify It Works

1. Open http://localhost:5173
2. Click **Sign Up**
3. Create an account with email/password
4. You should be redirected to the dashboard

**Congratulations!** You have a working FlowStack application.

---

## What Just Happened?

```
┌─────────────────────────────────────────────┐
│   User signs up at /auth/sign-up            │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│   Better Auth creates user in database      │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│   Session created, user logged in           │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│   Redirected to /dashboard                  │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| `Database connection failed` | Check PostgreSQL is running and `DATABASE_URL` is correct |
| `Port 5173 already in use` | Kill the process: `lsof -ti:5173 \| xargs kill` |
| `Module not found` | Run `bun install` again |
| `Auth errors` | Ensure `BETTER_AUTH_SECRET` is set |

See [Troubleshooting Guide](../auth/troubleshooting.md) for more help.

---

## 👉 Next: [First Steps](./first-steps.md)

Learn how to:
- Change your app name
- Customize redirect paths
- Add your first protected route
