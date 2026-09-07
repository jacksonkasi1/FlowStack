# Prerequisites

> **Level:** 🟢 Beginner | **Time:** ⏱️ 5 min

Before setting up FlowStack, ensure you have these prerequisites installed and configured.

---

## ✅ Checklist

### 1. Node.js (v18 or higher)

**Why:** FlowStack uses modern JavaScript features.

**Check if installed:**
```bash
node --version
# Should show v18.x.x or higher
```

**Install if missing:**
- [Download Node.js](https://nodejs.org/) (LTS version recommended)
- Or use [nvm](https://github.com/nvm-sh/nvm): `nvm install 18`

---

### 2. Package Manager (Bun recommended)

**Why:** Faster installs, better monorepo support.

**Check if installed:**
```bash
bun --version
```

**Install if missing:**
```bash
curl -fsSL https://bun.sh/install | bash
```

> **Alternative:** npm or pnpm also work, but bun is recommended.

---

### 3. PostgreSQL Database

**Why:** FlowStack uses PostgreSQL for data storage.

**Options:**

| Option | Best For | Setup |
|--------|----------|-------|
| **Local PostgreSQL** | Development | [Install guide](https://www.postgresql.org/download/) |
| **Docker** | Easy setup | `docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres` |
| **Supabase** | Quick cloud DB | [supabase.com](https://supabase.com) |
| **Neon** | Serverless | [neon.tech](https://neon.tech) |

**Verify connection:**
```bash
psql postgresql://user:password@localhost:5432/dbname
```

---

### 4. Git

**Why:** Clone the repository.

**Check if installed:**
```bash
git --version
```

**Install if missing:**
- macOS: `xcode-select --install`
- Linux: `sudo apt install git`
- Windows: [git-scm.com](https://git-scm.com)

---

### 5. Code Editor

**Recommended:** [VS Code](https://code.visualstudio.com/) with extensions:
- ESLint
- Prettier
- TypeScript

---

## 📋 Quick Verification

Run this to check everything at once:

```bash
echo "Node: $(node --version)"
echo "Bun: $(bun --version 2>/dev/null || echo 'Not installed')"
echo "Git: $(git --version)"
echo "PostgreSQL: $(psql --version 2>/dev/null || echo 'Not installed')"
```

**Expected output:**
```
Node: v18.x.x or higher ✅
Bun: 1.x.x ✅
Git: git version 2.x.x ✅
PostgreSQL: psql (PostgreSQL) 15.x ✅
```

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| `node: command not found` | Add Node.js to PATH or reinstall |
| `Cannot connect to PostgreSQL` | Check if service is running: `pg_isready` |
| `Permission denied` | Use `sudo` or fix file permissions |

---

## 👉 Next: [Quick Start](./quickstart.md)
