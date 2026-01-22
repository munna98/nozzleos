"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HugeiconsIcon } from "@hugeicons/react"
import { CheckmarkCircle02Icon, Alert02Icon, Sun03Icon, Moon02Icon, SunsetIcon } from "@hugeicons/core-free-icons"
import { trpc } from "@/lib/trpc"
import { Nozzle } from "@/lib/api"
import { ShiftType } from "@prisma/client"

interface ShiftStartStepProps {
    shiftType: ShiftType
    setShiftType: (type: ShiftType) => void
    selectedNozzleIds: number[]
    setSelectedNozzleIds: (ids: number[]) => void
    onStart: () => void
    isStarting: boolean
}

export function ShiftStartStep({
    shiftType,
    setShiftType,
    selectedNozzleIds,
    setSelectedNozzleIds,
    onStart,
    isStarting
}: ShiftStartStepProps) {
    const nozzlesQuery = trpc.nozzle.getAll.useQuery()

    const availableNozzles = nozzlesQuery.data?.filter((n: Nozzle) => n.isActive) || []

    const toggleNozzleSelection = (nozzleId: number) => {
        const newIds = selectedNozzleIds.includes(nozzleId)
            ? selectedNozzleIds.filter(id => id !== nozzleId)
            : [...selectedNozzleIds, nozzleId]
        setSelectedNozzleIds(newIds)
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Start New Shift</CardTitle>
                    <CardDescription>
                        {new Date().toLocaleString('en-IN', {
                            dateStyle: 'full',
                            timeStyle: 'short'
                        })}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label>Shift Type</Label>
                        <Tabs
                            defaultValue={shiftType}
                            onValueChange={(val) => setShiftType(val as ShiftType)}
                            className="w-full"
                        >
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value={ShiftType.MORNING} className="flex gap-2">
                                    <HugeiconsIcon icon={Sun03Icon} className="h-4 w-4" />
                                    Morning
                                </TabsTrigger>
                                <TabsTrigger value={ShiftType.EVENING} className="flex gap-2">
                                    <HugeiconsIcon icon={SunsetIcon} className="h-4 w-4" />
                                    Evening
                                </TabsTrigger>
                                <TabsTrigger value={ShiftType.NIGHT} className="flex gap-2">
                                    <HugeiconsIcon icon={Moon02Icon} className="h-4 w-4" />
                                    Night
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    <div className="space-y-3">
                        <Label>Select Nozzles</Label>
                        {nozzlesQuery.isLoading ? (
                            <div>Loading nozzles...</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {availableNozzles.map((nozzle: Nozzle) => {
                                    const isUnavailable = !nozzle.isAvailable
                                    const isSelected = selectedNozzleIds.includes(nozzle.id)
                                    return (
                                        <Card
                                            key={nozzle.id}
                                            className={`transition-all relative overflow-hidden ${isSelected
                                                ? 'ring-2 ring-primary bg-primary/5'
                                                : isUnavailable
                                                    ? 'opacity-60 bg-muted cursor-not-allowed'
                                                    : 'cursor-pointer hover:bg-accent'
                                                }`}
                                            onClick={() => !isUnavailable && toggleNozzleSelection(nozzle.id)}
                                        >
                                            {isUnavailable && (
                                                <div className="absolute top-0 right-0 z-10 p-1">
                                                    <Badge variant="destructive" className="text-[10px] px-1 h-5">In Use</Badge>
                                                </div>
                                            )}
                                            <CardContent className="p-2">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <Badge variant="outline" className="h-4 px-1 text-[10px] shrink-0">{nozzle.code}</Badge>
                                                            <span className="font-medium text-xs truncate">{nozzle.fuel?.name}</span>
                                                        </div>
                                                        {isSelected && (
                                                            <HugeiconsIcon
                                                                icon={CheckmarkCircle02Icon}
                                                                className="h-4 w-4 text-primary shrink-0"
                                                            />
                                                        )}
                                                    </div>

                                                    <div className="flex items-baseline justify-between text-[10px] text-muted-foreground leading-none">
                                                        <span>{nozzle.dispenser?.code}</span>
                                                        <span className="font-medium text-foreground">₹{nozzle.price.toFixed(2)}</span>
                                                    </div>

                                                    <p className="text-xs font-medium leading-none mt-0.5">
                                                        {nozzle.currentreading.toFixed(1)} L
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                        {selectedNozzleIds.length === 0 && (
                            <Alert>
                                <HugeiconsIcon icon={Alert02Icon} className="h-4 w-4" />
                                <AlertDescription>
                                    Select at least 1 nozzle to continue
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Button
                onClick={onStart}
                className="w-full md:w-auto"
                disabled={isStarting || selectedNozzleIds.length === 0}
            >
                {isStarting ? "Starting..." : "Start Shift"}
            </Button>
        </div>
    )
}
