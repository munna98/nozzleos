import type { Metadata } from "next";
import { Geist, Geist_Mono, Lato, Merriweather, Roboto_Mono, Montserrat, Playfair_Display, Source_Code_Pro, Open_Sans, Source_Serif_4, IBM_Plex_Mono, Inter, JetBrains_Mono, Outfit, Fraunces, Space_Mono } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/components/theme-provider";
import { ColorThemeProvider } from "@/components/color-theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NavWrapper } from "@/components/nav-wrapper";
import { AuthGuard } from "@/components/auth-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
});

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "NozzleOS - Petrol Pump Management System | Fuel Station Software",
  description: "The complete petrol pump management system for modern fuel stations. Better than Petrosoft, Petrobyte, and Petrobunk. Manage shifts, inventory, and staff with NozzleOS.",
  keywords: [
    "petrol pump management system",
    "petrol pump management software",
    "petrol bunk management system",
    "petrol bunk management software",
    "fuel station management system",
    "gas station software",
    "pump management system",
    "petrosoft",
    "petrobyte",
    "petrobunk",
    "petrogem",
    "nozzleos"
  ],
  authors: [{ name: "NozzleOS Team" }],
  creator: "NozzleOS",
  publisher: "NozzleOS",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    title: "NozzleOS - Smart Petrol Pump Management System",
    description: "The all-in-one operating system built to manage pumps, payments, and precision at the nozzle. Designed for modern fuel stations.",
    url: "https://nozzleos.com",
    siteName: "NozzleOS",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "NozzleOS Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NozzleOS - Fuel Station Management System",
    description: "Complete shift closures in minutes with automated calculations and error detection.",
    creator: "@nozzleos",
    images: ["/twitter-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "NozzleOS",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "description": "The all-in-one operating system built to manage pumps, payments, and precision at the nozzle.",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "featureList": [
    "Petrol Pump Management",
    "Shift Handovers",
    "Real-time Analytics",
    "Inventory Control",
    "Staff Management"
  ]
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${lato.variable} ${merriweather.variable} ${robotoMono.variable} ${montserrat.variable} ${playfairDisplay.variable} ${sourceCodePro.variable} ${openSans.variable} ${sourceSerif4.variable} ${ibmPlexMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} ${fraunces.variable} ${spaceMono.variable}`}
    >
      <body className="antialiased">
        <TRPCProvider>
          <AuthProvider>
            <ColorThemeProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
              >
                <AuthGuard>
                  <NavWrapper />
                  <div className="flex-1">
                    {children}
                  </div>
                </AuthGuard>
                <Toaster />
              </ThemeProvider>
            </ColorThemeProvider>
          </AuthProvider>
        </TRPCProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  );
}
