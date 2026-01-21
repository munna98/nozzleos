Clean NozzleOS Project Structure
Simplified Next.js full-stack application with:

Local PostgreSQL for development
Neon PostgreSQL for production (Vercel)
HTTP-only cookie authentication
Current State Analysis
Component	Current	New Structure
Backend	Separate Express app (apps/api)	Next.js API routes
Frontend	Next.js (apps/web)	Single Next.js app
Auth	JWT in localStorage	HTTP-only cookies
DB	PostgreSQL (Neon)	PostgreSQL (Neon) - no change
Real-time	Socket.io	Removed
Monorepo	Turbo with packages	Simplified single app
User Review Required
IMPORTANT

Breaking Change: This is a complete project restructure. The existing codebase will be replaced with a new clean structure. Seed data will be recreated.

New Project Structure
nozzleos/
├── .env.local              # Local development environment
├── .env.production         # Production environment (for reference only)
├── .gitignore
├── next.config.ts
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── prisma/
│   ├── schema.prisma       # Database schema (keep existing)
│   └── seed.ts             # Database seeding
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx        # Home/Redirect
│   │   ├── globals.css
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── shift/
│   │   │   └── page.tsx
│   │   ├── shift-history/
│   │   │   └── page.tsx
│   │   ├── employees/
│   │   │   └── page.tsx
│   │   ├── dispensers/
│   │   │   └── page.tsx
│   │   ├── fuels/
│   │   │   └── page.tsx
│   │   ├── customers/
│   │   │   └── page.tsx
│   │   ├── payment-methods/
│   │   │   └── page.tsx
│   │   └── api/
│   │       └── trpc/
│   │           └── [trpc]/
│   │               └── route.ts   # tRPC API handler
│   ├── server/
│   │   ├── trpc/
│   │   │   ├── init.ts            # tRPC initialization
│   │   │   ├── router.ts          # Main app router
│   │   │   └── context.ts         # Context with HTTP-only auth
│   │   ├── routers/
│   │   │   ├── auth.ts
│   │   │   ├── user.ts
│   │   │   ├── shift.ts
│   │   │   ├── nozzle.ts
│   │   │   ├── dispenser.ts
│   │   │   ├── fuel.ts
│   │   │   ├── customer.ts
│   │   │   └── payment-method.ts
│   │   └── services/
│   │       ├── auth.service.ts    # JWT + cookie handling
│   │       └── shift.service.ts
│   ├── lib/
│   │   ├── prisma.ts              # Prisma client singleton
│   │   ├── trpc.ts                # tRPC React client
│   │   ├── auth-context.tsx       # Simplified auth context
│   │   └── utils.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   └── ...                    # App components
│   └── types/
│       └── index.ts
└── public/
    └── ...
Proposed Changes
Core Configuration
[NEW] 
.env.local
Local development environment variables:

# Database (Local PostgreSQL)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/nozzleos"
# Auth
JWT_SECRET="dev-jwt-secret-min-32-characters-long"
JWT_REFRESH_SECRET="dev-refresh-secret-min-32-chars-long"
# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
[NEW] 
.env.production
Production environment variables (for Vercel dashboard reference):

# Database (Neon - set in Vercel dashboard)
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
# Auth (set in Vercel dashboard)
JWT_SECRET="generate-strong-secret-for-production"
JWT_REFRESH_SECRET="generate-strong-refresh-secret-for-production"
# App
NEXT_PUBLIC_APP_URL="https://your-app.vercel.app"
NODE_ENV="production"
Server-Side (API Routes + tRPC)
[NEW] 
src/server/trpc/context.ts
Server context that reads auth from HTTP-only cookies:

Parse JWT from auth_token cookie
Validate and extract user info
Provide user context to all procedures
[NEW] 
src/server/services/auth.service.ts
HTTP-only cookie authentication service:

login(): Validate credentials, generate JWT, set HTTP-only cookie in response
logout(): Clear HTTP-only cookie
getSession(): Verify JWT from cookie
Cookie settings: httpOnly: true, secure: true (prod), sameSite: 'lax'
[NEW] 
src/server/routers/auth.ts
Auth router with cookie-based login/logout:

login: Sets HTTP-only cookie via response headers
logout: Clears cookie
me: Returns current user from context
[MIGRATE] Existing Routers
Move from apps/api/src/routers/ to src/server/routers/:

user.ts
shift.ts
nozzle.ts
dispenser.ts
fuel.ts
customer.ts
payment-method.ts
Client-Side
[NEW] 
src/lib/auth-context.tsx
Simplified auth context:

No localStorage token storage
No token refresh logic in client
Just fetch /me on mount to check auth status
Login form calls tRPC mutation (cookie set server-side)
[NEW] 
src/lib/trpc.ts
tRPC React client:

Uses httpBatchLink to /api/trpc
credentials: 'include' for cookies
No auth header interceptors needed
[MIGRATE] Existing Components
Move from apps/web/components/ to src/components/:

All UI components (shadcn/ui)
App-specific components
[MIGRATE] Existing Pages
Move from apps/web/app/ to src/app/:

All page components
Update imports
Database
[KEEP] 
prisma/schema.prisma
Keep existing schema, move from packages/db/prisma/ to root prisma/

Files to Delete
After migration, remove:

apps/ directory (entire)
packages/ directory (entire)
pnpm-workspace.yaml
turbo.json
Root .env.example (replaced with new env files)
Verification Plan
Local Development Test
Create new project structure
Run npm install
Run npx prisma generate
Run npx prisma db push (or npx prisma migrate deploy)
Run npm run dev
Test login flow at http://localhost:3000/login
Verify cookie is set (DevTools > Application > Cookies)
Navigate to shift page and verify API calls work
Production Deployment Test
Push to GitHub
Connect to Vercel
Set environment variables in Vercel dashboard
Deploy
Run npx prisma migrate deploy via Vercel CLI or seed script
Test login on production URL
Running Locally
# 1. Install dependencies
npm install
# 2. Setup environment
cp .env.local.example .env.local
# Edit .env.local with your Neon connection string
# 3. Generate Prisma client
npx prisma generate
# 4. Push schema to database (or run migrations)
npx prisma db push
# 5. Seed database (optional)
npx prisma db seed
# 6. Start development server
npm run dev
# App runs at http://localhost:3000
Hosting on Vercel
Prerequisites
GitHub repository with the code
Neon database project
Vercel account
Steps
Create Neon Database:

Go to neon.tech
Create new project
Copy connection string (pooled for serverless)
Connect to Vercel:

Import repository on Vercel dashboard
Select Next.js framework
Set Environment Variables in Vercel:

DATABASE_URL=postgresql://...@...neon.tech/neondb?sslmode=require
JWT_SECRET=<generate-strong-32-char-secret>
JWT_REFRESH_SECRET=<generate-strong-32-char-secret>
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
Configure Build Settings:

Build command: prisma generate && next build
Output directory: .next
Deploy:

Vercel will auto-deploy on push
First deployment may need manual prisma migrate deploy
Seed Database (if needed):

npx vercel env pull .env.production.local
npx prisma db seed
Decisions Made
✅ Fresh project creation using npx create-next-app
✅ Local PostgreSQL for development, Neon for production
✅ Continue with shadcn/ui for components
✅ No data migration needed - seed data only