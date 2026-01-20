"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, TimeQuarterPassIcon } from "@hugeicons/core-free-icons"
import { useRouter } from "next/navigation"

interface ShiftSuccessStepProps {
    onHome: () => void
}

export function ShiftSuccessStep({ onHome }: ShiftSuccessStepProps) {
    const router = useRouter()

    return (
        <div className="max-w-md mx-auto py-10 text-center space-y-4">
            <div className="flex justify-center">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-10 w-10" />
                </div>
            </div>
            <h2 className="text-2xl font-bold">Shift Submitted!</h2>
            <p className="text-muted-foreground">
                Your shift has been successfully recorded and closed.
                You can view the details in your history.
            </p>
            <div className="pt-4 space-y-3">
                <Button onClick={onHome} className="w-full">
                    Return to Dashboard
                </Button>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/shift-history')}
                >
                    <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-4 w-4 mr-2" />
                    View Shift History
                </Button>
            </div>
        </div>
    )
}

