# Training Platform

B2B SaaS hypertrophy training platform for commercial gym coaches.

Coaches create and manage evidence-based training programs for their clients using a rule-based engine that autoregulates volume, intensity, and progression across 4-week blocks.

---

## Tech Stack

| Layer    | Technology                                   |
|----------|----------------------------------------------|
| Mobile   | Expo 54 + React Native 0.81 + Expo Router 5  |
| API      | NestJS 11 + TypeScript (Clean Architecture)  |
| Shared   | TypeScript package (`@training/shared`)      |
| Database | PostgreSQL 15                                |
| Monorepo | pnpm workspaces                              |

---

## Prerequisites

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0 — `npm install -g pnpm`
- **Docker** >= 24.0.0 (for PostgreSQL)
- **Expo Go** app on your phone, or Android/iOS simulator

---

## Installation

```bash
# 1. Clone the repository
git clone <repo-url>
cd MobileApp---Training

# 2. Install all dependencies (all workspaces)
pnpm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD
```

---

## Running the Project

### Start the database

```bash
pnpm docker:up
# PostgreSQL runs on localhost:5432
```

### Start the API

```bash
pnpm dev:api
# http://localhost:3000
```

### Start the Mobile app

```bash
pnpm dev:mobile
# Scan the QR code with Expo Go, or press:
#   a → Android emulator
#   i → iOS simulator (macOS only)
#   w → web browser
```

### Build the shared package

Run this after modifying types or validation in `@training/shared`:

```bash
pnpm build:shared
```

### Build the API

```bash
pnpm build:api
```

### Lint all packages

```bash
pnpm lint
```

### Stop the database

```bash
pnpm docker:down
```

---

## Project Structure

```
.
├── apps/
│   ├── api/                        # NestJS REST API (@training/api)
│   │   └── src/
│   │       ├── modules/            # Feature modules (empty — Phase 1)
│   │       ├── common/
│   │       │   ├── decorators/
│   │       │   ├── guards/
│   │       │   ├── interceptors/
│   │       │   └── pipes/
│   │       ├── config/             # Configuration module
│   │       ├── app.module.ts
│   │       ├── app.controller.ts
│   │       ├── app.service.ts
│   │       └── main.ts
│   └── mobile/                     # Expo React Native app (@training/mobile)
│       └── app/                    # Expo Router file-system routes
│           ├── _layout.tsx         # Root Stack navigator
│           ├── index.tsx           # Entry redirect
│           ├── (auth)/
│           │   ├── _layout.tsx
│           │   └── login.tsx       # AuthScreen placeholder
│           ├── (trainer)/
│           │   ├── _layout.tsx
│           │   └── dashboard.tsx   # TrainerDashboard placeholder
│           └── (client)/
│               ├── _layout.tsx
│               └── dashboard.tsx   # ClientDashboard placeholder
├── packages/
│   └── shared/                     # @training/shared
│       └── src/
│           ├── types/
│           │   └── index.ts        # Role, User, VolumeLandmarks, etc.
│           ├── validation/
│           │   └── index.ts        # Placeholder
│           └── index.ts            # Re-exports
├── docker-compose.yml
├── .env.example
├── pnpm-workspace.yaml
├── tsconfig.base.json              # Shared strict TS baseline
├── eslint.config.mjs               # Root ESLint v9 flat config
├── .prettierrc
└── package.json                    # Root workspace scripts
```

---

## Environment Variables

| Variable            | Default           | Required | Description                    |
|---------------------|-------------------|----------|--------------------------------|
| `POSTGRES_USER`     | `training_user`   | No       | PostgreSQL username             |
| `POSTGRES_PASSWORD` | —                 | **Yes**  | PostgreSQL password             |
| `POSTGRES_DB`       | `training_db`     | No       | PostgreSQL database name        |
| `POSTGRES_PORT`     | `5432`            | No       | PostgreSQL host port            |
| `PORT`              | `3000`            | No       | API server port                 |
| `NODE_ENV`          | `development`     | No       | Runtime environment             |
| `DATABASE_URL`      | —                 | Phase 1  | Full DB connection string       |

---

## Phase 1 Scope

- Hypertrophy training only
- 4-week blocks: 3 accumulation weeks + 1 deload week
- Volume landmarks: MV, MEV, MAV, MRV
- Double progression model
- Autoregulation via reps and RIR
- Rule-based engine (no AI)
- Roles: `org_owner`, `trainer`, `client`
- Exercise technique via video only (≤ 20 seconds)

---

## Workspace Commands Reference

| Command             | Description                              |
|---------------------|------------------------------------------|
| `pnpm dev:api`      | Start API in watch mode                  |
| `pnpm dev:mobile`   | Start Expo Metro bundler                 |
| `pnpm build:shared` | Compile `@training/shared` to `dist/`    |
| `pnpm build:api`    | Build NestJS API                         |
| `pnpm lint`         | Run ESLint across all packages           |
| `pnpm format`       | Format all files with Prettier           |
| `pnpm test`         | Run tests across all packages            |
| `pnpm docker:up`    | Start PostgreSQL container               |
| `pnpm docker:down`  | Stop PostgreSQL container                |
