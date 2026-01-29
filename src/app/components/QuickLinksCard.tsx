"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    TimeQuarterPassIcon,
    Invoice01Icon,
    UserGroupIcon,
    FuelStationIcon,
    Settings01Icon,
    UserIcon,
    UserListIcon,
    LinkCircleIcon
} from "@hugeicons/core-free-icons"

export function QuickLinksCard() {
    const router = useRouter()

    const links = [
        {
            label: "Shift History",
            icon: TimeQuarterPassIcon,
            href: "/reports/shift-history",
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-950/20"
        },
        {
            label: "Payments Report",
            icon: Invoice01Icon,
            href: "/reports/payments",
            color: "text-green-500",
            bgColor: "bg-green-50 dark:bg-green-950/20"
        },
        {
            label: "Staff Performance",
            icon: UserGroupIcon,
            href: "/reports/staff-performance",
            color: "text-purple-500",
            bgColor: "bg-purple-50 dark:bg-purple-950/20"
        }
    ]

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                    <HugeiconsIcon icon={LinkCircleIcon} className="h-5 w-5 text-muted-foreground" />
                    Quick Links
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-3">
                    {links.map((link) => (
                        <Button
                            key={link.href}
                            variant="outline"
                            className="h-auto py-3 flex flex-col gap-2 items-center justify-center hover:border-primary/50 hover:bg-accent/50 transition-all group"
                            onClick={() => router.push(link.href)}
                        >
                            <div className={`p-2 rounded-full ${link.bgColor} ${link.color} group-hover:scale-110 transition-transform`}>
                                <HugeiconsIcon icon={link.icon} className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-medium text-center text-muted-foreground group-hover:text-foreground">
                                {link.label}
                            </span>
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
