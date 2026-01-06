"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function TopNav() {
    const pathname = usePathname()

    const routes = [
        {
            href: "/",
            label: "Dashboard",
            active: pathname === "/",
        },
        {
            href: "/employees",
            label: "Employees",
            active: pathname === "/employees",
        },
    ]

    return (
        <nav className="border-b bg-background">
            <div className="container mx-auto flex h-16 items-center px-4">
                <div className="mr-8 flex items-center">
                    <Link href="/" className="font-bold text-xl mr-6">
                        NozzleOS
                    </Link>
                </div>
                <div className="flex items-center space-x-4 lg:space-x-6">
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
                </div>
            </div>
        </nav>
    )
}
