# MileMoto Server - Local setup (Node + Express + MySQL)

## Prereqs
- Node.js 20+
- MySQL 8+ (or MariaDB). With XAMPP: start **MySQL**.
- Create DB: `CREATE DATABASE milemoto CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`

## Setup
1) Create/update `milemoto-serverside/.env` (see required vars in `milemoto-serverside/src/config/env.ts`).
2) `npm i`
3) `npm run migrate`   # applies Drizzle migrations in `milemoto-serverside/drizzle`
4) `npm run dev`       # http://localhost:4000

Health check: `GET /api/v1/health` -> `{ ok: true, ... }`

## Notes
- The server depends on `@milemoto/types`; `predev/prebuild/prestart` build it automatically.
- Build and run: `npm run build && npm start`
