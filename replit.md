# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

### `artifacts/geo3d-library` (`@workspace/geo3d-library`)

React + Vite frontend for the Geo3D Library platform. Professional dark geological theme (navy/amber).

- Pages: Home, Library, MapPage, Stratigraphy, Categories, ResourceDetail, LoginPage, SubscriptionPage, AdminPanel, Viewer3DPage
- Auth: JWT-based with httpOnly cookies + localStorage token fallback. `AuthContext` manages user state.
- Contexts: `src/contexts/AuthContext.tsx` — auth state; `src/contexts/SiteContentContext.tsx` — site content + edit mode
- Components: `DownloadButton`, `ResourceCard`, `Navbar`, `EditableText` (inline admin editing), `MapGridOverlay`, `MapOverlayControl` (north arrow + scale bar), `Viewer3DPage` (Three.js OBJ viewer)
- Routes: `/login`, `/subscription`, `/admin`, `/3d-viewer`, all content pages

#### Feature: 3D OBJ Viewer (`/3d-viewer`)
- Three.js canvas via `@react-three/fiber` + `@react-three/drei`
- OBJLoader streams models from `GET /api/geo-models/:id/file`
- Models grouped by geological zone (left sidebar accordion)
- Controls: wireframe toggle, 6 color options, grid floor toggle
- Admin upload panel: POST multipart to `/api/admin/geo-models/upload` (multer, max 200MB)
- Admin delete: DELETE `/api/admin/geo-models/:id` (removes DB record + file from disk)

#### Feature: Inline Text Editing
- `SiteContentContext` fetches key/value pairs from `GET /api/site-content` on app load
- Admin toggles "Editare text pagini" from user dropdown → activates `editMode`
- `EditableText` component wraps text with `contentKey` prop; shows pencil icon on hover when editMode active
- Saves to `PUT /api/admin/site-content/:key` (JWT-authenticated)
- Currently integrated on Home page hero title and subtitle

#### Feature: Map Grid Overlay
- `MapGridOverlay` component renders inside Leaflet `MapContainer`
- Three CRS modes: `geographic` (lat/lon), `utm` (WGS84 UTM auto-zone), `stereo70` (EPSG:31700 Romania)
- Uses `proj4` for coordinate transformations; draws dashed polylines with labels
- Grid panel accessible via "Grilă" button in MapPage toolbar
- `MapOverlayControl` renders north arrow SVG + dynamic scale bar as Leaflet bottomleft control (uses `createPortal`)

## Authentication System

### Backend (api-server)
- `src/lib/auth.ts` — JWT sign/verify helpers, middleware (`authMiddleware`, `optionalAuth`, `requireAdmin`, `requireSubscription`)
- `src/routes/auth.ts` — endpoints: POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me, POST /auth/subscribe, GET /admin/users, PATCH /admin/users/:id
- Passwords hashed with bcryptjs (12 rounds). JWT expires in 7 days.

### Admin Account
- Email: vladnegru1986@gmail.com
- Password: Romania86$
- Role: admin | Subscription: business

### Subscription Tiers
- **Basic** (Free) — map viewing + stratigraphy only, NO downloads
- **Pro** (€400/month) — map + image + 3D model + dataset downloads
- **Business** (€2000/month) — Pro + reports, publications, databases, API

### Stripe Integration
- Connector: `conn_stripe_01KKVW5BTPBP8NZ6KAEYX2SK9Z` (Replit Stripe integration)
- `STRIPE_SECRET_KEY` env var set from Replit Stripe connection settings
- `STRIPE_PUBLISHABLE_KEY` env var set from Replit Stripe connection settings
- Products created in Stripe: "GeoViewer Pro" (€400/mo), "GeoViewer Business" (€2000/mo)
- Checkout: POST /api/stripe/checkout → returns Stripe Checkout session URL
- Verify: GET /api/stripe/verify-checkout?session_id=... → updates user subscription
- Portal: POST /api/stripe/portal → returns Stripe Customer Portal URL
- Webhook: POST /api/stripe/webhook (raw body, registered before express.json())
- Merchant name: "GeoViewer" (set in Stripe account)
- Source files: `src/stripeClient.ts`, `src/stripeService.ts`, `src/stripeStorage.ts`, `src/webhookHandlers.ts`, `src/routes/stripe.ts`
- Checkout success: `/checkout/success?session_id=...`
- Checkout cancel: `/checkout/cancel`

### Database Tables
- `users` table: id, email, password_hash, name, role (guest/user/admin), subscription (none/basic/pro/business), stripe_customer_id, stripe_subscription_id, created_at
- `resources`, `categories`, `map_points`, `stratigraphic_units` tables with Romanian geological data seeded
