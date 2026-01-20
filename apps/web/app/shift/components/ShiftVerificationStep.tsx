"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import { LockIcon } from "@hugeicons/core-free-icons"
import type { inferRouterOutputs } from "@trpc/server"
import type { AppRouter } from "@nozzleos/api"

type RouterOutputs = inferRouterOutputs<AppRouter>
type ShiftSession = NonNullable<RouterOutputs['shift']['getActive']>

interface ShiftVerificationStepProps {
    session: ShiftSession;
    onUpdateTestQty: (readingId: number, testQty: number) => void;
    onConfirm: () => void;
}

export function ShiftVerificationStep({
    session,
    onUpdateTestQty,
    onConfirm
}: ShiftVerificationStepProps) {
    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Verify Opening Readings</CardTitle>
                    <CardDescription>
                        These readings are locked and cannot be changed
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {session.nozzleReadings.map((reading) => (
                        <Card key={reading.id} className="bg-muted/50">
                            <CardContent className="p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge>{reading.nozzle.code}</Badge>
                                        <span className="font-medium">{reading.nozzle.fuel.name}</span>
                                    </div>
                                    <HugeiconsIcon icon={LockIcon} className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Opening Reading (Locked)</Label>
                                        <p className="text-lg font-medium">
                                            {parseFloat(reading.openingReading.toString()).toFixed(2)} L
                                        </p>
                                    </div>

                                    <div>
                                        <Label htmlFor={`test-${reading.id}`}>
                                            Test Qty (Optional)
                                        </Label>
                                        <Input
                                            id={`test-${reading.id}`}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            defaultValue={parseFloat(reading.testQty.toString())}
                                            onBlur={(e) => {
                                                const value = parseFloat(e.target.value) || 0
                                                onUpdateTestQty(reading.id, value)
                                            }}
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Liters used for nozzle function test
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </CardContent>
            </Card>

            <div className="flex gap-3">
                <Button onClick={onConfirm} className="flex-1">
                    Confirm & Begin Shift
                </Button>
            </div>
        </div>
    )
}
