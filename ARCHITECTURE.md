# Spaceman — Architecture Reference

> **Audience:** AI coding agents and engineers onboarding to this codebase.  
> This document describes the full technical architecture: database schema, entity relationships, API surface, component design, auth model, and conventions. Read this before making changes.

---

## 1. Platform Overview

Spaceman is a **Next.js 14 App Router** application that manages self-storage facilities. The domain covers:

| Entity | Purpose |
|--------|---------|
| Location | A physical storage facility (branch) |
| Unit | An individual storage space within a location |
| Client | A customer/tenant |
| Contract | A rental agreement binding a Client to a Unit |
| LocationArea | A named visual floor-plan canvas for a Location |
| UnitAreaPlacement | The x/y/size/rotation of a Unit on a LocationArea canvas |

---

## 2. Database Schema (Prisma / PostgreSQL)

### 2.1 Entity Map

```
Settings         (singleton site config)

users  ────────► Role
  │
  └─► activities

Location
  ├─► Unit ──────────────────────────► Contract ◄── Client
  ├─► Contract                            │
  └─► LocationArea ──► UnitAreaPlacement ◄┘(via unitId)
                           │
                           └─► Unit (placement reference)
```

### 2.2 Model Definitions

#### `settings` (table: `settings`)
Site-wide branding singleton. Only one row should exist.

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| siteName | String | Default "Skeleton" |
| siteLogo | String? | URL |
| siteDescription | String? | |
| primaryColor | String | Hex, default `#3b82f6` |
| updatedAt | DateTime | Auto-updated |

---

#### `users` (table: `users`)
Authentication and identity.

| Column | Type | Notes |
|--------|------|-------|
| id | BigInt (autoincrement) | PK |
| username | String? unique | Max 12 chars |
| email | String unique | Max 255 chars |
| password | String | bcryptjs hash |
| authLevel | Int | Default 1; legacy escalation field |
| roleId | Int? | FK → `roles.id` |
| banned | Boolean | Default false |
| active | Boolean | Default true |
| passwdRecoveryCode | String? | |
| passwdRecoveryDate | DateTime? | |
| passwdModifiedAt | DateTime? | |
| lastLogin | DateTime? | |
| createdAt | DateTime | |
| modifiedAt | DateTime | Auto-updated |

Relations: `role → Role`, `activities → activities[]`

---

#### `roles` (table: `roles`)
RBAC role definitions.

| Column | Type | Notes |
|--------|------|-------|
| id | Int (autoincrement) | PK |
| name | String unique | e.g. "ADMIN", "USER" |
| label | String | Human-readable display name |
| description | String? | |
| isSystem | Boolean | System roles cannot be deleted |
| permissions | Json | Permission flags object `{}` |
| priority | Int | Higher = more privileged |
| active | Boolean | |

The `permissions` JSON object contains boolean flags that map to specific feature guards in API routes and UI hooks. Admins bypass all checks.

---

#### `activities` (table: `activities`)
Audit log entries.

| Column | Type | Notes |
|--------|------|-------|
| id | Int (autoincrement) | PK |
| userId | BigInt | FK → `users.id` (CASCADE delete) |
| type | String | e.g. "LOGIN", "PROFILE_UPDATE" |
| title | String | Short human-readable description |
| description | String? | Optional detail |
| metadata | Json? | Arbitrary context payload |
| createdAt | DateTime | Indexed with `type` |

---

#### `locations` (table: `locations`)
Physical storage facilities.

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| name | String | |
| slug | String unique | Auto-generated from name |
| code | String? unique | Short identifier |
| addressLine1..2 | String? | |
| townCity | String? | |
| county | String? | |
| postcode | String? | |
| email | String? | |
| phone | String? | |
| openingHours | String? | Free text |
| latitude | Decimal(10,7)? | |
| longitude | Decimal(10,7)? | |
| active | Boolean | Default true |
| legacyId | Int? unique | Migration reference |
| createdById / updatedById | BigInt? | Audit FKs (not enforced at DB level) |

Relations: `units → Unit[]`, `contracts → Contract[]`, `areas → LocationArea[]`

---

#### `units` (table: `units`)
Individual storage spaces belonging to a location.

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| legacyId | Int? unique | Migration reference |
| locationId | String | FK → `locations.id` (RESTRICT delete) |
| code | String | Unique per location (not enforced by DB constraint — enforced in app) |
| name | String? | Display label |
| type | String? | e.g. "Standard", "Container" |
| sizeSqft | Int? | Square footage |
| dimensions | String? | e.g. "10x10" |
| weeklyRate | Decimal(10,2)? | |
| monthlyRate | Decimal(10,2)? | |
| salePrice | Decimal(10,2)? | |
| offer | String? | Promotional text |
| is24hDriveUp | Boolean | Default false |
| isIndoor | Boolean | Default false |
| status | UnitStatus | Default AVAILABLE |
| active | Boolean | Default true |
| description | String? | |

Relations: `location → Location`, `contracts → Contract[]`, `areaPlacements → UnitAreaPlacement[]`

#### `UnitStatus` enum
```
AVAILABLE | RESERVED | OCCUPIED | MAINTENANCE | INACTIVE
```

---

#### `clients` (table: `clients`)
Tenant/customer records.

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| legacyId | Int? unique | |
| status | ClientStatus | Default ACTIVE |
| companyName | String? | |
| firstName | String | Required |
| lastName | String | Required |
| email | String? | |
| phone | String? | |
| billingEmail | String? | |
| notes | String? | |
| addressLine1..2 / townCity / county / postcode / country | String? | |

Relations: `contracts → Contract[]`

#### `ClientStatus` enum
```
ACTIVE | INACTIVE | LEAD
```

---

#### `contracts` (table: `contracts`)
Rental agreements — the central transactional record.

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| contractNumber | String unique | Auto-generated `CTR-YYYYMMDD-XXXX` |
| legacyId | Int? unique | |
| status | ContractStatus | Default DRAFT |
| clientId | String | FK → `clients.id` (RESTRICT) |
| unitId | String | FK → `units.id` (RESTRICT) |
| locationId | String | FK → `locations.id` (RESTRICT) |
| startDate | DateTime | Required |
| endDate | DateTime? | |
| billingDay | Int? | Day of month for billing |
| weeklyRate | Decimal(10,2)? | Rate at time of contract (snapshot) |
| monthlyRate | Decimal(10,2)? | |
| depositAmount | Decimal(10,2)? | |
| paymentMethod | String? | |
| signedAt | DateTime? | |
| notes | String? | |

#### `ContractStatus` enum
```
DRAFT → PENDING_SIGNATURE → ACTIVE → TERMINATED
                                    → EXPIRED
                                    → CANCELLED
```

**Important:** `locationId` on `Contract` is denormalised (it is already known via `unit.locationId`) for query performance and reporting.

---

#### `location_areas` (table: `location_areas`)
Named visual canvas zones within a location (floors, sections).

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| locationId | String | FK → `locations.id` (CASCADE delete) |
| name | String | e.g. "Ground Floor", "Block A" |
| description | String? | |
| backgroundImageUrl | String? | Uploaded or external URL |
| canvasWidth | Int | Default 1400 px |
| canvasHeight | Int | Default 820 px |
| sortOrder | Int | Display order; auto-incremented on create |
| active | Boolean | Default true |

Relations: `location → Location`, `placements → UnitAreaPlacement[]`

---

#### `unit_area_placements` (table: `unit_area_placements`)
Stores the visual position of a unit on an area canvas.

| Column | Type | Notes |
|--------|------|-------|
| id | String (cuid) | PK |
| areaId | String | FK → `location_areas.id` (CASCADE delete) |
| unitId | String | FK → `units.id` (CASCADE delete) |
| shape | PlacementShape | Default RECTANGLE |
| x | Float | Canvas x origin |
| y | Float | Canvas y origin |
| width | Float | |
| height | Float | |
| rotation | Float | Degrees, default 0 |
| zIndex | Int | Layer order |
| label | String? | Override display text |
| points | Json? | For POLYGON shapes: array of `[x,y]` pairs |

#### `PlacementShape` enum
```
RECTANGLE | POLYGON
```

---

### 2.3 Cascade / Restrict Summary

| Relation | onDelete |
|----------|---------|
| Location → Unit | RESTRICT (cannot delete location with units) |
| Location → Contract | RESTRICT |
| Location → LocationArea | CASCADE |
| LocationArea → UnitAreaPlacement | CASCADE |
| Unit → Contract | RESTRICT (cannot delete unit with contracts) |
| Unit → UnitAreaPlacement | CASCADE |
| Client → Contract | RESTRICT |
| users → activities | CASCADE |

---

## 3. API Routes

All API routes are in `src/app/api/`. Every route:
1. Calls `getCurrentUser()` → returns 401 if not authenticated
2. Calls `isAdmin(user)` for write operations → returns 403 if not admin
3. Calls `serializeForJson()` on Prisma results to convert `BigInt` and `Decimal` to JSON-safe values

### 3.1 Auth

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | * | NextAuth handler (credentials provider) |
| `/api/auth/permissions` | GET | Returns current user's permission flags from their role |

### 3.2 Settings

| Route | Method | Description |
|-------|--------|-------------|
| `/api/settings` | GET | Fetch singleton Settings row |
| `/api/settings` | PUT | Update Settings (admin only) |

### 3.3 Users

| Route | Method | Description |
|-------|--------|-------------|
| `/api/users` | GET | List users (admin only); supports `?search=` |
| `/api/users` | POST | Create user (admin only) |
| `/api/users/list` | GET | Lightweight list for dropdowns |
| `/api/users/[id]` | GET | Get single user |
| `/api/users/[id]` | PUT | Update user (admin or self) |
| `/api/users/[id]` | DELETE | Delete user (admin only; cannot self-delete) |

### 3.4 Roles

| Route | Method | Description |
|-------|--------|-------------|
| `/api/roles` | GET | List all roles |
| `/api/roles` | POST | Create role (admin only) |
| `/api/roles/[id]` | GET | Get single role |
| `/api/roles/[id]` | PUT | Update role (admin only) |
| `/api/roles/[id]` | DELETE | Delete role (admin only; cannot delete system roles) |

Role permissions are stored in `roles.permissions` as JSON. The application currently supports flat dotted keys such as:

- `menus.users`
- `menus.locations`
- `actions.roles.manage`
- `actions.contracts.manage`

Nested JSON is also accepted by API routes and flattened at runtime.

### 3.5 Locations

| Route | Method | Description |
|-------|--------|-------------|
| `/api/locations` | GET | List; `?search=` filters name/city/postcode; includes `_count` |
| `/api/locations` | POST | Create location (admin only) |
| `/api/locations/[id]` | GET | Get with `units` + last 10 `contracts` (with client+unit) |
| `/api/locations/[id]` | PUT | Partial update; regenerates slug if name changes |
| `/api/locations/[id]` | DELETE | Delete (blocks if has units) |

### 3.6 Location Areas

| Route | Method | Description |
|-------|--------|-------------|
| `/api/locations/[id]/areas` | GET | All areas ordered by sortOrder; each includes placements with unit details |
| `/api/locations/[id]/areas` | POST | Create area; auto-increments sortOrder |
| `/api/locations/[id]/areas/[areaId]` | GET | Single area with placements |
| `/api/locations/[id]/areas/[areaId]` | PUT | **Transactional**: update area meta + delete all placements then recreate from body |
| `/api/locations/[id]/areas/[areaId]` | DELETE | Delete area (placements cascade) |

**PUT body shape for area save:**
```json
{
  "name": "Ground Floor",
  "description": "",
  "backgroundImageUrl": "https://...",
  "canvasWidth": 1400,
  "canvasHeight": 820,
  "active": true,
  "placements": [
    {
      "unitId": "clxxx",
      "shape": "RECTANGLE",
      "x": 120, "y": 80,
      "width": 110, "height": 50,
      "rotation": 0, "zIndex": 0,
      "label": null
    }
  ]
}
```

### 3.7 Units

| Route | Method | Description |
|-------|--------|-------------|
| `/api/units` | GET | List; `?search=` on code/name/type; `?locationId=` filter; includes location + `_count.contracts` |
| `/api/units` | POST | Create unit (admin only) |
| `/api/units/[id]` | GET | Get with location + all contracts (with clients) |
| `/api/units/[id]` | PUT | Partial update any scalar/numeric field |
| `/api/units/[id]` | DELETE | Delete (blocks if has contracts) |

### 3.8 Clients

| Route | Method | Description |
|-------|--------|-------------|
| `/api/clients` | GET | List; `?search=` on name/email/company; includes `_count.contracts` |
| `/api/clients` | POST | Create client (admin only) |
| `/api/clients/[id]` | GET | Get with contracts (unit + location) |
| `/api/clients/[id]` | PUT | Partial update |
| `/api/clients/[id]` | DELETE | Delete |

### 3.9 Contracts

| Route | Method | Description |
|-------|--------|-------------|
| `/api/contracts` | GET | List; `?search=` on contractNumber/client name/unit code; includes client, unit+location |
| `/api/contracts` | POST | Create; auto-generates `contractNumber` if not provided; requires clientId+unitId+locationId+startDate |
| `/api/contracts/[id]` | GET | Full contract with client, unit+location, location |
| `/api/contracts/[id]` | PUT | Partial update; handles Date and Decimal fields |
| `/api/contracts/[id]` | DELETE | Hard delete |

### 3.10 Upload

| Route | Method | Description |
|-------|--------|-------------|
| `/api/upload` | POST | Multipart file upload; validates MIME type; max 3 MB; saves to `public/uploads/`; returns `{ url }` |

### 3.11 Fix-Role (utility)

| Route | Method | Description |
|-------|--------|-------------|
| `/api/fix-role` | GET/POST | One-time utility to repair role assignments; not part of normal flow |

---

## 4. Authentication & Authorisation

### 4.1 NextAuth v5 (beta)

- **Provider:** Credentials (email + password)
- **Session strategy:** JWT
- **Session payload:** `{ id, email, name, role }` where `role` is the role `name` string (e.g. `"ADMIN"`)
- **Config files:** `src/lib/auth.ts` (main config), `src/lib/auth.config.ts` (callbacks + pages)

### 4.2 Middleware (`src/middleware.ts`)

Runs on every request matching `/dashboard/:path*` and `/api/:path*`.

Flow:
1. Skip `/api/auth/*` (NextAuth internals)
2. Read JWT via `getToken()`
3. Also check `authjs.session-token` / `__Secure-authjs.session-token` cookies as fallback
4. If no token and no session cookie → redirect to `/login?callbackUrl=...`

### 4.3 Server-side Helpers (`src/lib/permissions.ts`)

```typescript
getCurrentUser()        // → SessionUser | null  (reads JWT from server session)
isAdmin(user)           // → boolean
isOwner(user, targetId) // → boolean
canManageUser(user, id) // → isAdmin || isOwner
getPermissionMapForUser(user) // → flattened permission map from role JSON
hasPermission(user, key)      // → checks key, supports admin/all bypass
requirePermission(key)        // throws 'Forbidden' if missing key
requireAuth()           // throws 'Unauthorized'
requireAdmin()          // throws 'Forbidden'
```

### 4.4 Client-side Hook (`src/hooks/usePermissions.ts`)

Fetches `/api/auth/permissions` on mount. Returns the user's permission flags object. Used in page components to conditionally render admin UI.

Hook returns:

- `hasPermission(key, defaultValue?)`
- `canManageRoles` (maps to `actions.roles.manage`)
- `canManageUsers` (maps to `actions.users.manage`)
- `permissionMap` (flattened key-value object)

### 4.5 Role Designer and Permission Extension

Role CRUD and permission editing is available in Settings under the Roles tab:

- Component: `src/components/role-designer.tsx`
- Page integration: `src/app/dashboard/settings/page.tsx`
- API persistence: `src/app/api/roles/route.ts`, `src/app/api/roles/[id]/route.ts`

When adding new functionality, update role authorisation in this order:

1. Add a new permission key in `src/components/role-designer.tsx` under `PERMISSION_GROUPS`, or add it as a custom key in the Role Designer UI.
2. Enforce the key where needed (sidebar visibility, page guards, API checks).
3. If the new feature has menu visibility, use `menus.<feature>`.
4. If the new feature controls write/admin actions, use `actions.<feature>.<verb>`.
5. Update this architecture document with any new permission domains so future changes remain consistent.

Current enforced API examples:

- Role CRUD requires `actions.roles.manage` (or ADMIN)
- User role assignment/list route requires `actions.users.manage` (or ADMIN)

Recommended key naming conventions:

- Menu visibility: `menus.<section>`
- Functional actions: `actions.<domain>.<operation>`

Examples:

- `menus.reports`
- `actions.reports.export`
- `actions.invoices.approve`

---

## 5. Frontend Architecture

### 5.1 App Shell (`src/components/dashboard-shell.tsx`)

- Fixed left sidebar (desktop) / slide-in drawer (mobile)
- Sidebar collapse state persisted in `localStorage` (`skeleton_sidebar_collapsed`)
- Navigation links: Dashboard, Locations, Units, Clients, Contracts, Users (admin only), Settings, Logout
- Site logo and name from `SettingsContext`
- Theme toggle from `ThemeContext`

### 5.2 Context Providers

#### `SettingsContext`
Fetches `/api/settings` on mount. Provides `{ siteName, siteLogo, siteDescription, primaryColor }` globally. Consumed by the shell and login page.

#### `ThemeContext`
Manages `light | dark | system` theme. Persists in `localStorage`. Applies CSS class to `<html>` element.

### 5.3 Location Area Editor (`src/components/location-area-editor.tsx`)

This is the most complex component. It is loaded with `dynamic(() => import(...), { ssr: false })` because react-konva requires a browser canvas context.

**Props:** `{ locationId: string }`

**State:**
- `areas` — all LocationArea records for this location
- `units` — all Unit records for this location
- `selectedAreaId` — currently active tab
- `placements` — local mutable copy of UnitAreaPlacement records for the selected area
- `areaMeta` — name, description, backgroundImageUrl, canvasWidth, canvasHeight, active
- `mode` — `'view' | 'edit'`
- `selectedPlacementId` — for Transformer node attachment

**Bootstrap (`bootstrap()`):**
```
GET /api/locations/:id/areas
GET /api/units?locationId=:id
→ setAreas, setUnits, selectArea(areas[0])
```

**Save (`handleSaveArea()`):**
```
PUT /api/locations/:id/areas/:areaId
body: { ...areaMeta, placements: [...] }
```
This is a full replace — server deletes all existing placements and recreates from the body.

**Canvas rendering:**
- React-Konva `Stage → Layer → [BackgroundImage, ...Rect+Text per placement, Transformer]`
- Each placement renders as a `Rect` (fill = `statusFill(unit.status)`) + `Text` (unit.code or label)
- Status colours: AVAILABLE=green, RESERVED=amber, OCCUPIED=blue, MAINTENANCE=red, INACTIVE=grey

**Drag-and-drop:**
- Units in sidebar are `draggable` HTML elements using `onDragStart` to set `dataTransfer`
- The canvas div uses `onDrop` to read the unit ID and create a new `Placement` at the drop coordinates
- Each unit can appear on a canvas at most once (enforced by `placementByUnitId` Set)

**Transformer:**
- Attached to the selected Konva node in a `useEffect` on `selectedPlacementId`
- Calls `updatePlacement()` on `onTransformEnd` to sync x/y/width/height/rotation back to state

---

## 6. Bulk Unit Generation

Units for a location can be declared in bulk by size. For example, declaring *"10 units of 36 sq ft"* generates 10 individual `Unit` records with:
- `code` = `36Sq 1`, `36Sq 2` … `36Sq 10`
- `sizeSqft` = 36
- `locationId` pointing to the current location

The generated units immediately appear in the Area Designer sidebar and can be dragged onto the canvas. Each unit has its own `status` field, and when a `Contract` with status `ACTIVE` is linked to a unit the unit status updates to `OCCUPIED`, which is reflected live in the canvas colour.

---

## 7. Data Import

`prisma/import-data.ts` handles legacy CSV imports via `csv-parse`.

Scripts:
- `npm run import:locations` — reads `locations.csv`, upserts `Location` records
- `npm run import:units` — reads `units.csv`, upserts `Unit` records (matches location via `legacyId`)
- `npm run import:all` — runs both in sequence

The `legacyId` field on `Location`, `Unit`, `Contract`, and `Client` is used as a stable external key for idempotent imports.

---

## 8. Utilities

### `src/lib/utils.ts`

#### `serializeForJson(data)`
Recursively converts `BigInt` → `string` and `Decimal` → `string` to make Prisma results safe for `JSON.stringify`. Called before every `NextResponse.json()` in API routes.

#### `cn(...classes)`
Tailwind class merger (clsx + tailwind-merge).

### `src/lib/prisma.ts`
Singleton Prisma client. Uses global variable in development to prevent hot-reload from creating multiple connections.

---

## 9. Conventions & Patterns

### API Route Pattern
```typescript
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // optional: if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  
  // ... business logic ...
  
  return NextResponse.json(serializeForJson(result));
}
```

### BigInt IDs
`users.id` is `BigInt`. Always convert with `BigInt(user.id)` when writing `createdById`/`updatedById`. Always pass through `serializeForJson` before returning.

### Decimal Fields
Prisma `Decimal` objects must pass through `serializeForJson` before JSON serialisation.

### Slug Generation
```typescript
const slug = String(name).toLowerCase().trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/(^-|-$)/g, '');
```
Used for `Location.slug`. Must be unique — collisions should be handled with a numeric suffix.

### Client-side Data Fetching
Pages are `'use client'` components that fetch data via `useEffect` → `fetch('/api/...')`. No React Query or SWR is used; all state is local `useState`.

### Admin-only Pages
Import `usePermissions` hook, check `permissions.isAdmin` (or session role). Redirect or show error if not admin.

### Form Submission
Pages use controlled inputs with `useState`. On submit, call `fetch` with `method: 'PUT'` or `'POST'`. Show inline error state. No form library (no React Hook Form / Zod on the client).

---

## 10. File Upload

`POST /api/upload` accepts `multipart/form-data` with fields:
- `file` — the file binary
- `type` — usage hint (e.g. `"location-area-background"`)

**Validation:**
- Allowed MIME types: `image/png`, `image/jpeg`, `image/gif`, `image/webp`, `image/svg+xml`
- Max size: 3 MB (enforced client-side and server-side)

**Storage:** Files are written to `public/uploads/` with a UUID filename. The response is `{ url: "/uploads/filename.ext" }`.

---

## 11. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AUTH_SECRET` | Yes | NextAuth JWT signing secret (min 32 chars) |
| `NEXTAUTH_URL` | Yes | Full public URL of the app |
| `NODE_ENV` | Auto | `development` or `production`; affects secure cookie flag |

---

## 12. Known Constraints & Gotchas

1. **`Unit.code` uniqueness** is not enforced by a DB unique constraint — only by application logic. When bulk-generating units, ensure the generation loop checks for existing codes.

2. **`Contract.locationId` is denormalised** — it duplicates `unit.location.id`. Always keep them in sync when creating contracts.

3. **Area save is destructive** — `PUT /api/locations/[id]/areas/[areaId]` deletes all `UnitAreaPlacement` rows and recreates them. Never call it in parallel with another save for the same area.

4. **`react-konva` requires SSR disabled** — always import `LocationAreaEditor` with `dynamic(..., { ssr: false })`.

5. **Leaflet map requires SSR disabled** — the map component on the locations list page uses `dynamic(..., { ssr: false })` for the same reason.

6. **No optimistic updates** — all mutations wait for the API response before updating UI state.

7. **No pagination** — list APIs currently return all matching records. Add pagination before deploying with large datasets.

8. **`BigInt` in JSON** — Prisma returns `BigInt` for `users.id`; always wrap API responses in `serializeForJson()`.

9. **`fix-role` route** — exists as a one-time migration utility. Do not rely on it in normal flows.
