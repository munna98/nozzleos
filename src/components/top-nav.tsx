"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth } from '@/lib/auth-context'
import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
// import { Button } from "@/components/ui/button" // Removed unused import
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { PanelLeftIcon } from "@hugeicons/core-free-icons" // Or any menu icon
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
import {
    DashboardCircleIcon,
    UserGroupIcon,
    UserListIcon,
    FuelStationIcon,
    Settings01Icon,
    Invoice01Icon,
    TimeQuarterPassIcon,
    CreditCardIcon,
    PieChartIcon,
    Logout01Icon,
    UserIcon,
    DropletIcon,
    UserMultipleIcon
} from "@hugeicons/core-free-icons"

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
            roles: ['Admin', 'Fuel Attendant', 'Manager'],
            icon: DashboardCircleIcon
        },
        // Super Admin Routes
        {
            href: "/admin",
            label: "Overview",
            active: pathname === "/admin",
            roles: ['Super Admin'],
            icon: DashboardCircleIcon
        },
        {
            href: "/admin/stations",
            label: "Stations",
            active: pathname.startsWith("/admin/stations"),
            roles: ['Super Admin'],
            icon: FuelStationIcon
        },
        // Standard Routes
        {
            href: "/employees",
            label: "Employees",
            active: pathname.startsWith("/employees"),
            roles: ['Admin', 'Manager'],
            icon: UserListIcon
        },
        {
            href: "/customers",
            label: "Customers",
            active: pathname.startsWith("/customers"),
            roles: ['Admin', 'Manager'],
            icon: UserMultipleIcon
        },
        {
            href: "/fuels",
            label: "Fuels",
            active: pathname.startsWith("/fuels"),
            roles: ['Admin'],
            icon: DropletIcon
        },
        {
            href: "/dispensers",
            label: "Dispensers",
            active: pathname.startsWith("/dispensers"),
            roles: ['Admin'],
            icon: FuelStationIcon
        },
        {
            href: "/payment-methods",
            label: "Payment Methods",
            active: pathname.startsWith("/payment-methods"),
            roles: ['Admin'],
            icon: CreditCardIcon
        },
        {
            href: "/settings",
            label: "Settings",
            active: pathname.startsWith("/settings"),
            roles: ['Admin', 'Manager'],
            icon: Settings01Icon
        },
        {
            label: "Reports",
            active: pathname.startsWith("/reports"),
            roles: ['Admin', 'Fuel Attendant', 'Manager'],
            icon: PieChartIcon,
            children: [
                {
                    href: "/reports/shift-history",
                    label: "Shift History",
                    active: pathname.startsWith("/reports/shift-history"),
                    roles: ['Admin', 'Fuel Attendant', 'Manager'],
                    icon: TimeQuarterPassIcon
                },
                {
                    href: "/reports/payments",
                    label: "Payments Report",
                    active: pathname.startsWith("/reports/payments"),
                    roles: ['Admin', 'Manager'],
                    icon: Invoice01Icon
                },
                {
                    href: "/reports/staff-performance",
                    label: "Staff Performance",
                    active: pathname.startsWith("/reports/staff-performance"),
                    roles: ['Admin', 'Manager'],
                    icon: UserGroupIcon
                }
            ]
        },
    ]

    const routes = allRoutes.filter(route =>
        !route.roles || (user?.role && route.roles.includes(user.role))
    ).map(route => ({
        ...route,
        children: route.children?.filter(child => !child.roles || (user?.role && child.roles.includes(user.role)))
    }))

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
                                <HugeiconsIcon icon={PanelLeftIcon} className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-[280px] p-0 flex flex-col h-full bg-background/95 backdrop-blur-md">
                            <SheetHeader className="p-0">
                                <SheetTitle className="sr-only">NozzleOS Navigation</SheetTitle>
                                <div className="p-4 border-b bg-muted/30">
                                    <Link href="/" onClick={() => setOpen(false)} className="flex items-center gap-3 group">
                                        <div className="relative h-8 w-8 group-hover:scale-105 transition-transform">
                                            <Image
                                                src="/NozzleOS_light.png"
                                                alt="NozzleOS"
                                                fill
                                                sizes="32px"
                                                className="object-contain hidden dark:block"
                                                priority
                                            />
                                            <Image
                                                src="/NozzleOS_dark.png"
                                                alt="NozzleOS"
                                                fill
                                                sizes="32px"
                                                className="object-contain block dark:hidden"
                                                priority
                                            />
                                        </div>
                                        <span className="font-bold text-lg tracking-tight text-foreground">NozzleOS</span>
                                    </Link>
                                </div>
                            </SheetHeader>

                            <div className="flex-1 overflow-y-auto py-4">
                                <nav className="px-2 space-y-1">
                                    {routes.map((route) => (
                                        route.children ? (
                                            <div key={route.label} className="mt-4 first:mt-0">
                                                <div className="px-4 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                    {route.label}
                                                </div>
                                                <div className="space-y-1">
                                                    {route.children.map(child => (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            onClick={() => setOpen(false)}
                                                            className={cn(
                                                                "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                                                child.active
                                                                    ? "bg-primary/10 text-primary shadow-sm"
                                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                            )}
                                                        >
                                                            {child.icon && (
                                                                <HugeiconsIcon
                                                                    icon={child.icon}
                                                                    className={cn(
                                                                        "h-5 w-5 transition-colors",
                                                                        child.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                                    )}
                                                                />
                                                            )}
                                                            {child.label}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <Link
                                                key={route.href || route.label}
                                                href={route.href || '#'}
                                                onClick={() => setOpen(false)}
                                                className={cn(
                                                    "group flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                                                    route.active
                                                        ? "bg-primary/10 text-primary shadow-sm"
                                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                                )}
                                            >
                                                {route.icon && (
                                                    <HugeiconsIcon
                                                        icon={route.icon}
                                                        className={cn(
                                                            "h-5 w-5 transition-colors",
                                                            route.active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                                                        )}
                                                    />
                                                )}
                                                {route.label}
                                            </Link>
                                        )
                                    ))}
                                </nav>
                            </div>

                            <div className="p-3 border-t bg-muted/30">
                                <div className="flex items-center justify-between gap-3 px-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <Avatar className="h-9 w-9 border-2 border-background shrink-0">
                                            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                                {user?.name?.charAt(0).toUpperCase() || 'U'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-sm font-bold truncate leading-none mb-1">{user?.name}</span>
                                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tight leading-none">{user?.role}</span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                        onClick={() => { setOpen(false); handleLogout(); }}
                                        title="Sign Out"
                                    >
                                        <HugeiconsIcon icon={Logout01Icon} className="h-5 w-5" />
                                        <span className="sr-only">Sign Out</span>
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <Link href="/" className="flex items-center gap-2 group">
                        <div className="relative h-8 w-8 group-hover:scale-105 transition-transform">
                            <Image
                                src="/NozzleOS_light.png"
                                alt="NozzleOS"
                                fill
                                sizes="32px"
                                className="object-contain hidden dark:block"
                                priority
                            />
                            <Image
                                src="/NozzleOS_dark.png"
                                alt="NozzleOS"
                                fill
                                sizes="32px"
                                className="object-contain block dark:hidden"
                                priority
                            />
                        </div>
                        <span className="font-bold text-xl tracking-tight">NozzleOS</span>
                    </Link>
                </div>
                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
                    {routes.map((route) => (
                        route.children ? (
                            <DropdownMenu key={route.label}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className={cn(
                                        "text-sm font-medium transition-colors hover:text-primary h-auto py-2 px-3",
                                        route.active ? "text-black dark:text-white" : "text-muted-foreground"
                                    )}>
                                        {route.label}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    {route.children.map(child => (
                                        <DropdownMenuItem key={child.href} asChild>
                                            <Link href={child.href} className="cursor-pointer w-full">
                                                {child.label}
                                            </Link>
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Link
                                key={route.href || route.label}
                                href={route.href || '#'}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    route.active
                                        ? "text-black dark:text-white"
                                        : "text-muted-foreground"
                                )}
                            >
                                {route.label}
                            </Link>
                        )
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
