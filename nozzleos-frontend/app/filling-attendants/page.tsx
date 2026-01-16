"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { HugeiconsIcon } from "@hugeicons/react"
import { UserIcon } from "@hugeicons/core-free-icons"

const getInitials = (name: string) => {
    return name
        .split(' ')
        .filter(n => n)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

export default function FillingAttendantsPage() {
    const { user } = useAuth()

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div className="flex justify-center items-center min-h-[60vh]">
                <Card className="w-full max-w-2xl">
                    <CardHeader className="text-center space-y-4">
                        <div className="flex justify-center">
                            <Avatar className="h-24 w-24">
                                <AvatarFallback className="text-3xl">
                                    {user?.name ? getInitials(user.name) : <HugeiconsIcon icon={UserIcon} className="h-12 w-12" />}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle className="text-4xl font-bold">
                            Welcome, {user?.name || 'Filling Attendant'}!
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-xl text-muted-foreground">
                            You are logged in as a <span className="font-semibold text-foreground">Filling Attendant</span>
                        </p>
                        <p className="text-muted-foreground">
                            More features coming soon...
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
