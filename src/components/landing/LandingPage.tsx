"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    FuelStationIcon,
    ChartHistogramIcon,
    Shield02Icon,
    FlashIcon,
    UserGroupIcon,
    Building02Icon,
    PanelLeftIcon
} from "@hugeicons/core-free-icons"
import { Boxes } from "@/components/ui/boxes"
import { ModeToggle } from "@/components/mode-toggle"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export default function LandingPage() {
    const [open, setOpen] = useState(false)

    return (
        <div className="flex flex-col min-h-screen">
            {/* Header */}
            <header className="sticky top-0 z-50 border-b backdrop-blur-md bg-background/80">
                <div className="container mx-auto flex h-16 items-center px-4 lg:px-6">
                    <div className="flex items-center gap-2">
                        {/* Mobile Menu Trigger */}
                        <Sheet open={open} onOpenChange={setOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="md:hidden">
                                    <HugeiconsIcon icon={PanelLeftIcon} className="h-5 w-5" />
                                    <span className="sr-only">Toggle menu</span>
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[280px] p-0 flex flex-col h-full bg-background/95 backdrop-blur-md">
                                <SheetHeader className="p-4 border-b bg-muted/30">
                                    <SheetTitle className="sr-only">NozzleOS Navigation</SheetTitle>
                                    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
                                            <HugeiconsIcon icon={FuelStationIcon} className="h-5 w-5" />
                                        </div>
                                        <span className="font-bold text-lg tracking-tight">NozzleOS</span>
                                    </Link>
                                </SheetHeader>
                                <div className="flex-1 py-6 px-4">
                                    <nav className="flex flex-col gap-4">
                                        <Link
                                            href="#features"
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors py-2"
                                        >
                                            <HugeiconsIcon icon={FlashIcon} className="h-5 w-5 text-muted-foreground" />
                                            Features
                                        </Link>
                                        <Link
                                            href="/login"
                                            onClick={() => setOpen(false)}
                                            className="flex items-center gap-3 text-lg font-medium hover:text-primary transition-colors py-2"
                                        >
                                            <HugeiconsIcon icon={UserGroupIcon} className="h-5 w-5 text-muted-foreground" />
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/login"
                                            onClick={() => setOpen(false)}
                                            className="mt-4"
                                        >
                                            <Button className="w-full h-12">Get Started</Button>
                                        </Link>
                                    </nav>
                                </div>
                            </SheetContent>
                        </Sheet>

                        <Link className="flex items-center justify-center font-bold text-xl" href="/">
                            <HugeiconsIcon icon={FuelStationIcon} className="h-6 w-6 mr-2 text-primary" />
                            <span>NozzleOS</span>
                        </Link>
                    </div>

                    {/* Desktop Navigation */}
                    <nav className="ml-auto hidden md:flex gap-6 items-center mr-4">
                        <Link className="text-sm font-medium hover:text-primary transition-colors" href="#features">
                            Features
                        </Link>
                        <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
                            Sign In
                        </Link>
                        <Link href="/login">
                            <Button size="sm">Get Started</Button>
                        </Link>
                    </nav>

                    {/* Theme Toggle & Right Actions */}
                    <div className={cn("flex items-center gap-2", "ml-auto md:ml-0")}>
                        <ModeToggle />
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="relative w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute inset-0 w-full h-full bg-background z-20 [mask-image:radial-gradient(transparent,white)] pointer-events-none" />

                    {/* Bottom Blending Gradient */}
                    <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-muted/30 to-transparent z-25 pointer-events-none" />

                    <Boxes />

                    <div className="container relative z-30 mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center space-y-4 text-center">
                            <div className="space-y-2">
                                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-orange-400 pb-2">
                                    Fueling Your Fuel Stations.
                                </h1>
                                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl font-light">
                                    The all-in-one operating system built to manage pumps, payments, and precision at the nozzle.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
                                <Link href="/login" className="w-full sm:w-auto">
                                    <Button size="lg" className="h-12 px-8 w-full">Start Free Trial</Button>
                                </Link>
                                <Link href="#features" className="w-full sm:w-auto">
                                    <Button variant="outline" size="lg" className="h-12 px-8 w-full">Learn More</Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-muted/30">
                    <div className="container mx-auto px-4 md:px-6">
                        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
                            <div className="inline-block rounded-lg bg-primary/10 px-3 py-1 text-sm text-primary">
                                Key Features
                            </div>
                            <h2 className="text-3xl font-bold tracking-tighter md:text-4xl">
                                Everything you need to run your station
                            </h2>
                            <p className="max-w-[900px] text-muted-foreground md:text-lg">
                                Built with input from station owners and attendants to solve real-world problems.
                            </p>
                        </div>
                        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
                            <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={FlashIcon} className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Fast Shift Handovers</h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Complete shift closures in minutes with automated calculations and error detection.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={ChartHistogramIcon} className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Real-time Analytics</h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Track sales, density, and inventory levels in real-time from anywhere in the world.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={Shield02Icon} className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Multi-Tenant Security</h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Enterprise-grade data isolation ensures your station's data remains private and secure.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={UserGroupIcon} className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Staff Management</h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Manage shifts, track performance, and handle payroll with integrated staff tools.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={Building02Icon} className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Multi-Station Support</h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Scale effortlessly. Manage one station or one hundred from a single super-admin portal.
                                </p>
                            </div>
                            <div className="flex flex-col items-center space-y-2 border rounded-xl p-6 bg-background shadow-sm hover:shadow-md transition-all">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <HugeiconsIcon icon={FuelStationIcon} className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-bold">Inventory Control</h3>
                                <p className="text-sm text-muted-foreground text-center">
                                    Automated dip readings and density tracking help prevent theft and leakage.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center border-t font-light text-sm text-muted-foreground bg-background">
                <div className="container mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center w-full">
                    <p>&copy; 2026 NozzleOS. All rights reserved.</p>
                    <nav className="sm:ml-auto flex gap-4 sm:gap-6 mt-2 sm:mt-0">
                        <Link className="hover:underline underline-offset-4" href="#">
                            Terms of Service
                        </Link>
                        <Link className="hover:underline underline-offset-4" href="#">
                            Privacy
                        </Link>
                    </nav>
                </div>
            </footer>
        </div>
    )
}
