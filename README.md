# Spaceman — Self-Storage Management Platform

Spaceman is a full-stack web application for managing self-storage facilities. It covers the complete operational lifecycle: locations, storage units, clients, contracts, and visual floor-plan mapping.

## 🚀 Features

### Core Business Modules
- **Locations** — Branch/facility management with full address, geo-coordinates, opening hours, and interactive map view
- **Units** — Storage unit inventory per location with pricing (weekly/monthly/sale), size (sqft + dimensions), features (indoor, 24h drive-up), and occupancy status
- **Bulk Unit Templates** — Declare how many units exist per size at a location (e.g. "10 units of 36 sq ft"); units are auto-generated and numbered sequentially (e.g. `36Sq 1`, `36Sq 2` … `36Sq 10`)
- **Clients** — Customer records with contact details, billing address, and status (Active / Inactive / Lead)
- **Contracts** — Rental agreements linking a client to a unit with start/end dates, billing day, rates, deposit, and full status lifecycle
- **Visual Area Designer** — Canvas-based drag-and-drop floor-plan editor per location where individual units can be placed, resized, and rotated; color-coded live by occupancy status; link units to contracts directly from the map

### Platform
- **Authentication** — Credentials-based login via NextAuth v5 with JWT sessions
- **Role-Based Access Control** — Fine-grained JSON permission system with configurable roles and per-feature guards
- **Activity Log** — Audit trail for all significant user actions
- **Site Settings** — Customisable name, logo, description, and primary brand colour stored in the database
- **Light / Dark / System Theme** — User preference persisted in localStorage
- **Responsive Design** — Works on mobile and desktop; collapsible sidebar

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Auth | NextAuth.js v5 (beta.22) |
| Database | PostgreSQL |
| ORM | Prisma 6 |
| Styling | Tailwind CSS 3.4 |
| Canvas / Map editor | React-Konva (Konva 9) |
| Interactive map | Leaflet 1.9 |
| Icons | Lucide React |
| Data import | csv-parse |

## 📦 Installation

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm

### Steps

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/spaceman?schema=public"
   AUTH_SECRET="your-secret-key-min-32-characters"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Apply the database schema**
   ```bash
   npm run db:push
   ```

4. **Seed default roles and admin user**
   ```bash
   npm run db:seed
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

### Data Import Scripts
Legacy CSV data can be imported with:
```bash
npm run import:locations   # import locations from CSV
npm run import:units       # import units from CSV
npm run import:all         # import everything
```

## 🔐 Default Credentials

| Role  | Email | Password |
|-------|-------|----------|
| Admin | admin@example.com | admin123 |
| User  | user@example.com  | user123  |

> **Change these immediately in production.**

## 👥 User & Role Management

### Built-in Roles

| Role | Access |
|------|--------|
| ADMIN | Full access to all modules and admin features |
| USER  | View-only access; can edit own profile |

Roles are stored in the `roles` table with a `permissions` JSON field. Custom roles can be added directly in the database or via the Users admin panel.

### Permission Flags (stored as JSON in `roles.permissions`)
The permissions object keys map to specific API and UI guards. Admins bypass all permission checks.

## 📍 Locations

Each location represents a storage facility branch.

**Fields:** name, slug (auto-generated), code, full address, email, phone, opening hours, lat/lng coordinates, active flag.

**Location Editor tabs:**
- **Details** — Edit all location metadata; geocoding button auto-fills lat/lng via Nominatim (OSM)
- **Areas** — Visual floor-plan designer (see Area Designer below)

**List page** shows two tabs:
- **List** — Searchable table with unit and contract counts, edit/delete actions
- **Map** — Leaflet interactive map with circle markers for each location (lazy-loaded)

## 📦 Units

Each unit belongs to a location and represents a physical storage space.

**Fields:** code (unique per location), name, type, `sizeSqft`, dimensions, weekly/monthly/sale rates, offer text, `is24hDriveUp`, `isIndoor`, `status`, `active`, description.

### Unit Status Lifecycle

```
AVAILABLE → RESERVED → OCCUPIED → AVAILABLE
                      ↓
                  MAINTENANCE
                  INACTIVE
```

| Status | Colour on map |
|--------|--------------|
| AVAILABLE | Green |
| RESERVED | Amber |
| OCCUPIED | Blue |
| MAINTENANCE | Red |
| INACTIVE | Grey |

### Bulk Unit Generation (per Location)
On the location detail page you can declare unit templates:
> *"10 units of 36 sq ft"*

This generates 10 individual `Unit` records numbered `36Sq 1` through `36Sq 10`. Generated units then appear in the Area Designer sidebar and can be placed on the canvas. Each can be linked to a contract to drive live occupancy status colouring.

## 🤝 Clients

Customer records used as the subscriber side of a contract.

**Fields:** firstName, lastName, companyName, email, phone, billingEmail, billing address, notes, status (ACTIVE / INACTIVE / LEAD).

## 📄 Contracts

Contracts link a **Client** → **Unit** → **Location** for a rental period.

**Fields:** contractNumber (auto-generated `CTR-YYYYMMDD-XXXX`), status, startDate, endDate, billingDay, weeklyRate, monthlyRate, depositAmount, paymentMethod, signedAt, notes.

### Contract Status Lifecycle

```
DRAFT → PENDING_SIGNATURE → ACTIVE → TERMINATED
                                   → EXPIRED
                                   → CANCELLED
```

When a contract is **ACTIVE** the linked unit's status on the canvas is shown as **OCCUPIED** (blue).

## 🗺️ Area Designer

The visual floor-plan editor lives at `/dashboard/locations/[id]/edit` → Areas tab.

### Concepts
- A **Location** has zero or more **LocationArea** records (floors/zones)
- Each Area has a **canvas** (default 1400×820 px) with an optional background image
- **UnitAreaPlacement** records store where each unit sits on the canvas (x, y, width, height, rotation, zIndex, shape)

### Interaction
1. Switch to **Edit Mode**
2. Drag a unit from the left sidebar onto the canvas
3. Click a placed unit to select it; use the `Transformer` handles to resize/rotate
4. Right-click (or press Delete) to remove a placement from the canvas
5. Click **Save Layout** to persist all placements

Background images can be uploaded (max 3 MB; PNG/JPEG/WebP/SVG accepted) or supplied as a URL.

### Canvas Technology
Built with **react-konva** (HTML5 Canvas via Konva.js). Each unit renders as a coloured `Rect` with a `Text` label. A `Transformer` node handles resize/rotate in edit mode.

## 📁 Project Structure

```
spaceman/
├── prisma/
│   ├── schema.prisma          # Full data model
│   ├── seed.ts                # Default roles + admin user
│   ├── import-data.ts         # CSV import scripts
│   └── migrations/
├── public/                    # Static assets & uploaded files
└── src/
    ├── app/
    │   ├── api/
    │   │   ├── auth/[...nextauth]/    # NextAuth handler
    │   │   ├── auth/permissions/      # Session permissions endpoint
    │   │   ├── clients/               # CRUD clients
    │   │   ├── contracts/             # CRUD contracts
    │   │   ├── locations/             # CRUD locations
    │   │   │   └── [id]/areas/        # CRUD areas + placements
    │   │   ├── roles/                 # CRUD roles
    │   │   ├── settings/              # Site settings
    │   │   ├── units/                 # CRUD units
    │   │   ├── upload/                # File upload handler
    │   │   └── users/                 # CRUD users + list
    │   ├── dashboard/
    │   │   ├── clients/               # Client list + edit
    │   │   ├── contracts/             # Contract list + edit
    │   │   ├── locations/             # Location list + edit (with area designer)
    │   │   ├── settings/              # Site + profile settings
    │   │   ├── units/                 # Unit list + edit
    │   │   └── users/                 # User list + new + edit
    │   ├── login/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   ├── dashboard-shell.tsx        # App shell: sidebar + header
    │   ├── location-area-editor.tsx   # Canvas floor-plan editor
    │   ├── theme-toggle.tsx
    │   └── ui/                        # Primitive UI components
    ├── contexts/
    │   ├── SettingsContext.tsx        # Site settings provider
    │   └── ThemeContext.tsx           # Theme provider
    ├── hooks/
    │   └── usePermissions.ts          # Client-side permission hook
    ├── lib/
    │   ├── auth.ts / auth.config.ts   # NextAuth configuration
    │   ├── permissions.ts             # Server-side permission helpers
    │   ├── prisma.ts                  # Prisma singleton
    │   └── utils.ts                   # serializeForJson, cn helpers
    └── middleware.ts                  # JWT route guard
```

## 🔧 npm Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema changes (no migration file) |
| `npm run db:migrate` | Create and apply a migration |
| `npm run db:studio` | Open Prisma Studio GUI |
| `npm run db:seed` | Seed default data |
| `npm run import:locations` | Import locations from CSV |
| `npm run import:units` | Import units from CSV |
| `npm run import:all` | Import all CSV data |

## 🔒 Security Notes

- All API routes check `getCurrentUser()` and return 401 if unauthenticated
- Admin-only mutations check `isAdmin()` and return 403
- Passwords are hashed with **bcryptjs**
- File uploads are validated by MIME type and limited to 3 MB
- `serializeForJson` strips `BigInt` values to avoid JSON serialisation errors
- The middleware JWT guard protects all `/dashboard/*` and `/api/*` paths (except `/api/auth/*`)
- `onDelete: Restrict` on critical FKs prevents orphaned data (e.g. cannot delete a location that has units)
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   └── tabs.tsx
│   │   ├── dashboard-shell.tsx
│   │   └── theme-toggle.tsx
│   ├── contexts/
│   │   ├── SettingsContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/
│   │   └── usePermissions.ts
│   ├── lib/
│   │   ├── auth.config.ts
│   │   ├── auth.ts
│   │   ├── permissions.ts
│   │   ├── prisma.ts
│   │   └── utils.ts
│   └── middleware.ts
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── public/
├── .env.example
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with default data

## 🚢 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy
5. Run seed script: `npx prisma db seed`

### Other Platforms
Make sure to:
1. Set environment variables
2. Build the project: `npm run build`
3. Run migrations: `npm run db:migrate`
4. Seed the database: `npm run db:seed`
5. Start the server: `npm run start`

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string (with pooler) | Yes |
| `DIRECT_URL` | PostgreSQL direct connection string | Yes |
| `AUTH_SECRET` | Secret for JWT signing (min 32 chars) | Yes |
| `NEXTAUTH_URL` | Your app URL (e.g., http://localhost:3000) | Production only |

## 🔒 API Protection

All API routes are protected with authentication and permission checks:

- **401 Unauthorized** - No valid session
- **403 Forbidden** - Valid session but insufficient permissions

### Protected Routes
- `/api/settings` - GET (all), POST (admin only)
- `/api/users` - GET/POST (admin only)
- `/api/users/[id]` - GET (admin/owner), PUT (admin/owner), DELETE (admin only)

## 🤝 Next Steps

After setting up the skeleton, you can:

1. **Add more auth providers** - Google, GitHub, etc.
2. **Add email verification** - Verify email on registration
3. **Add password reset** - Forgot password flow
4. **Implement audit logging** - Track all user actions
5. **Add two-factor auth** - TOTP or SMS
6. **Customize styling** - Modify Tailwind config and CSS
7. **Add tests** - Jest, Playwright, etc.
8. **Add more roles** - Create custom roles with specific permissions

## 📄 License

MIT

## 🙏 Credits

Based on swof-portal-2026 structure, simplified for authentication starter template.
