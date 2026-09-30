# NozzleOS

Modern fuel station management system built with Next.js, tRPC, PostgreSQL, and Tailwind CSS.

## Features

- **Full Stack Type Safety** with tRPC
- **Secure Authentication** using HTTP-only cookies and JWT
- **Database** management with Prisma and PostgreSQL
- **Modern UI** with Tailwind CSS and shadcn/ui
- **Role-based Access Control** (Admin, Manager, Attendant)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Local or Neon)

### installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.local` to `.env` (for Prisma CLI)
   ```bash
   cp .env.local .env
   ```
   Update `DATABASE_URL` in `.env` if needed.

4. Initialize Database:
   ```bash
   # Generate Prisma client
   npm run db:generate

   # Push schema to database
   npm run db:push

   # Seed initial data
   npm run db:seed
   ```

5. Start Development Server:
   ```bash
   npm run dev
   ```

   Visit `http://localhost:3000`

### Default Credentials

- **Admin**: `admin` / `admin123`
- **Attendant**: `attendant1` / `attendant123`

## Hosting on Vercel + Neon

1. **Database (Neon)**:
   - Create a project on [Neon](https://neon.tech)
   - Copy the **Pooled Connection String**

2. **Vercel Deployment**:
   - Push code to GitHub
   - Import project in Vercel
   - Set Environment Variables:
     - `DATABASE_URL`: Your Neon pooled connection string
     - `JWT_SECRET`: Generate a strong random string
     - `JWT_REFRESH_SECRET`: Generate a strong random string
     - `NEXT_PUBLIC_APP_URL`: Your Vercel domain (e.g. `https://nozzleos.vercel.app`)
     - `NODE_ENV`: `production`

3. **Build Settings**:
   - Framework Preset: Next.js
   - Build Command: `prisma generate && next build` (default)

4. **Post-Deployment**:
   - Go to Vercel dashboard not deployed?
   - You might need to run migrations remotely or connect via local CLI to prod DB.
   - To seed production DB:
     ```bash
     # Update .env to point to Neon DB
     npm run db:push
     npm run db:seed
     ```
