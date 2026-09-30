import dynamic from 'next/dynamic'
import { AuthRedirect } from "@/components/auth-redirect"

// Dynamically import LandingPage with no SSR? No, let's SSR it for SEO.
// But wait, LandingPage is a client component.
// Importing it directly is fine, Next.js handles it.
import LandingPage from "@/components/landing/LandingPage"

export default function Page() {
  return (
    <>
      <AuthRedirect />
      <LandingPage />
    </>
  )
}
