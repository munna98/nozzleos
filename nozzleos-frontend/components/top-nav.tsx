"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button" // Removed unused import
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu01Icon } from "@hugeicons/core-free-icons" // Or any menu icon
import { HugeiconsIcon } from "@hugeicons/react"
import { ModeToggle } from "@/components/mode-toggle"

export function TopNav() {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    const routes = [
        {
            href: "/",
            label: "Dashboard",
            active: pathname === "/",
        },
        {
            href: "/employees",
            label: "Employees",
            active: pathname.startsWith("/employees"),
        },
        {
            href: "/customers",
            label: "Customers",
            active: pathname.startsWith("/customers"),
        },
        {
            href: "/payment-methods",
            label: "Payment Methods",
            active: pathname.startsWith("/payment-methods"),
        },
    ]

    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto flex h-16 items-center px-4">
                <div className="mr-8 flex items-center">
                    {/* Mobile Menu Trigger */}
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="md:hidden mr-2">
                                <HugeiconsIcon icon={Menu01Icon} className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[240px] sm:w-[300px]">
                            <SheetHeader className="text-left border-b pb-4 mb-4">
                                <SheetTitle>NozzleOS</SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col space-y-4">
                                {routes.map((route) => (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "text-sm font-medium transition-colors hover:text-primary",
                                            route.active
                                                ? "text-foreground font-bold"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {route.label}
                                    </Link>
                                ))}
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Link href="/" className="font-bold text-xl mr-6">
                        NozzleOS
                    </Link>
                </div>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm font-medium transition-colors hover:text-primary",
                                route.active
                                    ? "text-black dark:text-white"
                                    : "text-muted-foreground"
                            )}
                        >
                            {route.label}
                        </Link>
                    ))}
                </div>
                {/* Helper for potential future user menu or other right-aligned items */}
                <div className="ml-auto flex items-center space-x-4">
                    <ModeToggle />
                </div>
            </div>
        </nav>
    )
}
