# Skeleton - Auth Starter

A Next.js 14 authentication starter template with NextAuth v5, Prisma, and Tailwind CSS.

## 🚀 Features

- **Next.js 14** - Latest version with App Router
- **TypeScript** - Type-safe development
- **NextAuth v5 (beta)** - Modern authentication
- **Prisma ORM** - Database toolkit with PostgreSQL
- **Tailwind CSS** - Utility-first styling
- **Light/Dark/System Theme** - Built-in theme support with system preference
- **Responsive Design** - Mobile-friendly layout
- **User Management** - Admin panel for managing users
- **Role-based Permissions** - ADMIN and USER roles
- **Site Settings** - Customizable site name, logo, description, and colors

## 📋 What's Included

### Authentication
- ✅ Credentials-based authentication (email/password)
- ✅ Session management with JWT
- ✅ Protected routes with middleware
- ✅ Login/logout functionality
- ✅ Role-based access control

### Pages
- `/login` - Authentication page
- `/dashboard` - Protected dashboard
- `/dashboard/settings` - User settings with tabs (Profile, Appearance, Site Settings, Users)
- `/dashboard/users` - User management (admin only)
- `/dashboard/users/new` - Create user (admin only)
- `/dashboard/users/[id]/edit` - Edit user (admin or owner)

### Components
- Dashboard layout with sidebar navigation
- Responsive design (mobile + desktop)
- Theme toggle (Light/Dark/System)
- UI components (Button, Input, Card, Tabs, Table, Badge, Select)

### Database Models
- `users` - User accounts with role support
- `Role` - User roles (ADMIN, USER)
- `activities` - Activity logging
- `Settings` - Site configuration

## 🛠️ Tech Stack

- **Framework:** Next.js 14.2
- **Language:** TypeScript 5
- **Auth:** NextAuth.js v5.0.0-beta.22
- **Database:** PostgreSQL with Prisma 6.19
- **Styling:** Tailwind CSS 3.4
- **UI Icons:** Lucide React

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database
- npm or yarn

### Steps

1. **Clone or copy this directory**
   ```bash
   cd /path/to/your/projects
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your database credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/skeleton_db?schema=public"
   DIRECT_URL="postgresql://user:password@localhost:5432/skeleton_db?schema=public"
   AUTH_SECRET="your-secret-key-min-32-characters"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Generate Prisma client**
   ```bash
   npm run db:generate
   ```

5. **Push database schema**
   ```bash
   npm run db:push
   ```

6. **Seed the database (creates default users)**
   ```bash
   npm run db:seed
   ```

7. **Run development server**
   ```bash
   npm run dev
   ```

8. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Default Credentials

After running the seed script, you can log in with:

| Role  | Email              | Password  |
|-------|-------------------|-----------|
| Admin | admin@example.com | admin123  |
| User  | user@example.com  | user123   |

**⚠️ Important:** Change these passwords immediately in production!

## 👥 User Management Guide

### Roles

| Role  | Permissions |
|-------|-------------|
| ADMIN | Full access: manage users, site settings, all features |
| USER  | Limited access: view/edit own profile only |

### Admin Features
- Create new users
- Edit any user's information
- Activate/deactivate users
- Delete users (except self)
- Assign roles
- Configure site settings

### User Features
- View own profile
- Edit own username and email
- Change own password
- Customize theme preference

### Permission Rules
- **Admins can do everything**
- **Users can only view/edit their own profile**
- Users cannot change their own role
- Users cannot access admin-only pages

## 🎨 Theme Customization

### Theme Options
- **Light** - Light mode
- **Dark** - Dark mode  
- **System** - Follows system preference

### Site Settings (Admin Only)
Configure in `/dashboard/settings` → Site Settings tab:

- **Site Name** - Displayed in navbar and login page
- **Logo URL** - Custom logo image URL
- **Description** - Site description on login page
- **Primary Color** - Main accent color (hex)

Changes are saved to the database and persist across sessions.

## 📁 Project Structure

```
skeleton/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── [...nextauth]/route.ts
│   │   │   │   └── permissions/route.ts
│   │   │   ├── settings/
│   │   │   │   └── route.ts
│   │   │   └── users/
│   │   │       ├── route.ts
│   │   │       └── [id]/route.ts
│   │   ├── dashboard/
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   ├── users/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── ui/
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
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
