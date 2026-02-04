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
  title: "NozzleOS - Fuel Station Management",
  description: "Modern fuel station management system",
  icons: {
    icon: "/NozzleOS_dark.png",
    apple: "/NozzleOS_dark.png",
  },
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
      </body>
    </html>
  );
}
