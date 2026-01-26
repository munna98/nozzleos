"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from '@/lib/auth-context'
import { useState } from "react"
import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button" // Removed unused import
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Menu01Icon } from "@hugeicons/core-free-icons" // Or any menu icon
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import { ModeToggle } from "@/components/mode-toggle"

export function TopNav() {
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    const { logout, user } = useAuth()
    const router = useRouter()
    const isAdmin = user?.role === 'Admin'

    const allRoutes = [
        {
            href: isAdmin ? "/" : "/dashboard",
            label: "Dashboard",
            active: pathname === (isAdmin ? "/" : "/dashboard"),
            roles: ['Admin', 'Fuel Attendant', 'Manager']
        },
        {
            href: "/shift-history",
            label: "Shift History",
            active: pathname.startsWith("/shift-history"),
            roles: ['Admin', 'Fuel Attendant', 'Manager']
        },
        {
            href: "/employees",
            label: "Employees",
            active: pathname.startsWith("/employees"),
            roles: ['Admin', 'Manager']
        },
        {
            href: "/customers",
            label: "Customers",
            active: pathname.startsWith("/customers"),
            roles: ['Admin', 'Manager']
        },
        {
            href: "/fuels",
            label: "Fuels",
            active: pathname.startsWith("/fuels"),
            roles: ['Admin']
        },
        {
            href: "/dispensers",
            label: "Dispensers",
            active: pathname.startsWith("/dispensers"),
            roles: ['Admin']
        },
        {
            href: "/payment-methods",
            label: "Payment Methods",
            active: pathname.startsWith("/payment-methods"),
            roles: ['Admin']
        },
        {
            href: "/settings",
            label: "Settings",
            active: pathname.startsWith("/settings"),
            roles: ['Admin', 'Manager']
        },
        {
            href: "/reports/payment-transactions",
            label: "Reports",
            active: pathname.startsWith("/reports/payment-transactions"),
            roles: ['Admin', 'Manager']
        },
    ]

    const routes = allRoutes.filter(route =>
        !route.roles || (user?.role && route.roles.includes(user.role))
    )

    const handleLogout = async () => {
        await logout()
        router.push('/login')
    }

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
                        <SheetContent side="left" className="w-[240px] sm:w-[300px] p-0">
                            <SheetHeader className="text-left border-b px-4 py-2 mb-1">
                                <SheetTitle className="text-lg">NozzleOS</SheetTitle>
                            </SheetHeader>
                            <div className="flex flex-col">
                                {routes.map((route) => (
                                    <Link
                                        key={route.href}
                                        href={route.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "px-4 py-2 text-sm font-medium transition-colors hover:text-primary hover:bg-accent rounded-md mx-2 my-0",
                                            route.active
                                                ? "text-foreground font-bold bg-accent"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {route.label}
                                    </Link>
                                ))}
                                <Button variant="ghost" className="justify-start px-4 mx-2 my-0 text-muted-foreground hover:text-primary hover:bg-accent" onClick={() => { setOpen(false); handleLogout(); }}>
                                    Logout
                                </Button>
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>{user?.name?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56" align="end" forceMount>
                            <DropdownMenuLabel className="font-normal">
                                <div className="flex flex-col space-y-1">
                                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                                    <p className="text-xs leading-none text-muted-foreground">
                                        {user?.role}
                                    </p>
                                </div>
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleLogout}>
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </nav>
    )
}
