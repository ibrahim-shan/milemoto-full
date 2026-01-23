# MileMoto Monorepo

MileMoto is a monorepo with three workspaces:
- `milemoto-serverside` (API/server)
- `milemoto-clientside` (Next.js admin + storefront)
- `packages/types` (shared types/schemas)

## Product Overview
- Admin dashboard + storefront UI
- Catalog, inventory, vendors, purchase orders, goods receipts
- RBAC, email + SMS/WhatsApp gateways, setup wizard

## System Requirements
- Node.js 20+
- npm 9+
- MySQL 8 / MariaDB 10.4+
- 2GB+ RAM recommended
- Windows/Linux/macOS supported

## Envato Installation (Fresh)
1) Install dependencies:
```bash
npm install
```

2) Create env files:
- Server: `milemoto-serverside/.env`
- Client: `milemoto-clientside/.env.local`

3) Run migrations:
```bash
npm -w milemoto-serverside run drizzle:migrate
```

4) Start servers:
```bash
npm -w milemoto-serverside run dev
npm -w milemoto-clientside run dev
```

5) Complete setup:
- Open `http://localhost:3000/admin/setup`
- Create the first admin (Super Admin)

## Default URLs (Local)
- Admin: `http://localhost:3000/admin`
- Setup: `http://localhost:3000/admin/setup`
- API: `http://localhost:4000/api/v1`

## Quick Start (Local)
1) Install deps:
```bash
npm install
```

2) Create env files:
- Server: `milemoto-serverside/.env`
- Client: `milemoto-clientside/.env.local`

3) Run migrations:
```bash
npm -w milemoto-serverside run drizzle:migrate
```

4) Start dev servers:
```bash
npm -w milemoto-serverside run dev
npm -w milemoto-clientside run dev
```

## Initial Setup (First Admin)
After the backend is running, complete setup via:
- Admin UI (recommended): `http://localhost:3000/admin/setup`
- API (programmatic): `POST /api/v1/setup/initialize`

This creates the first admin user and binds it to the Super Admin role.

## Requirements
- Node.js 20+
- npm 9+
- MySQL / MariaDB

## Environment
Create env files:
- Server: `milemoto-serverside/.env`
- Client: `milemoto-clientside/.env.local`

See `milemoto-serverside/src/config/env.ts` for required server vars.

### Common Server Env Keys
Required values vary by deployment. See `milemoto-serverside/src/config/env.ts` for full list.
```
NODE_ENV=
PORT=
FRONTEND_BASE_URL=
PUBLIC_API_BASE_URL=
MYSQL_HOST=
MYSQL_PORT=
MYSQL_USER=
MYSQL_PASSWORD=
MYSQL_DATABASE=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
```

### Email + SMS Gateways
- Email settings are stored via Admin -> Settings -> Mail
- SMS/WhatsApp settings are stored via Admin -> Settings -> SMS Gateway
- For local testing you can use a sandbox SMTP provider

## Project Structure
```
milemoto-serverside/   # API + services (Drizzle, Express)
milemoto-clientside/   # Next.js admin + storefront
packages/types/        # Shared types and Zod schemas
```

## Database (Drizzle)
From the repo root:
```bash
npm -w milemoto-serverside run drizzle:migrate
```

To generate a new migration after schema changes:
```bash
npm -w milemoto-serverside run drizzle:generate
```

Notes:
- Migrations are the source of truth for schema changes.
- `packages/types/src/db.schema.ts` must stay in sync with DB migrations.

## Run (Dev)
```bash
npm -w milemoto-serverside run dev
npm -w milemoto-clientside run dev
```

## Build (Prod)
```bash
npm -w milemoto-serverside run build
npm -w milemoto-clientside run build
```

## Production Notes
- Set `NODE_ENV=production` and secure secrets in a vault.
- Use a process manager (PM2/systemd).
- Enable HTTPS and configure trusted proxies if behind a load balancer.

## Lint + Typecheck
```bash
npm -w milemoto-serverside run lint
npm -w milemoto-serverside run typecheck
npm -w milemoto-clientside run lint
npm -w milemoto-clientside run typecheck
```

## Tests
```bash
npm -w milemoto-serverside run test
npm -w @milemoto/types run test
```

Run a single backend test file:
```bash
npm -w milemoto-serverside run test -- tests/path/to/file.test.ts
```

## Troubleshooting
- CORS: ensure `CORS_ORIGINS` matches your client origin.
- Images: configure allowed domains in `milemoto-clientside/next.config.ts`.
- Windows EPERM rename errors: stop dev server, delete `.next/`, retry.
- Auth/Setup issues: re-run `drizzle:migrate` to ensure seeds are applied.

## Support
For installation help, provide:
- OS, Node.js version
- Error logs from server/client
- Steps to reproduce

## Codebase Guides
- `CODING_FLOW.md` for implementation flow
- `.agent/reviews/` for audit/checklist files
