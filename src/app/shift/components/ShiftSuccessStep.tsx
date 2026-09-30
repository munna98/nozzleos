"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, TimeQuarterPassIcon, MoneyReceive01Icon } from "@hugeicons/core-free-icons"
import { useRouter } from "next/navigation"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@/server/trpc/router"

type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSummary = RouterOutputs['shift']['getSummary']

interface ShiftSuccessStepProps {
    onHome: () => void
    summary?: ShiftSummary
}

export function ShiftSuccessStep({ onHome, summary }: ShiftSuccessStepProps) {
    const router = useRouter()

    return (
        <div className="max-w-md mx-auto py-10 text-center space-y-4">
            <div className="flex justify-center">
                <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-10 w-10" />
                </div>
            </div>
            <h2 className="text-2xl font-bold">Shift Submitted!</h2>
            <div className="space-y-1">
                <p className="text-muted-foreground">
                    Your shift has been successfully recorded and closed.
                </p>
                {summary && (
                    <p className="flex items-center justify-center gap-2 font-medium">
                        Final Status:
                        <span className={summary.shortage < 0 ? 'text-red-600' : summary.shortage > 0 ? 'text-green-600' : 'text-primary'}>
                            {summary.shortage > 0 ? 'Excess' : summary.shortage < 0 ? 'Shortage' : 'Balanced'}
                            ({summary.shortage > 0 ? '+' : summary.shortage < 0 ? '-' : ''}₹{Math.abs(summary.shortage).toFixed(2)})
                        </span>
                    </p>
                )}
            </div>
            <div className="pt-4 space-y-3">
                <Button onClick={onHome} className="w-full">
                    Return to Dashboard
                </Button>
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => router.push('/reports/shift-history')}
                >
                    <HugeiconsIcon icon={TimeQuarterPassIcon} className="h-4 w-4 mr-2" />
                    View Shift History
                </Button>
            </div>
        </div>
    )
}

