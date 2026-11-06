"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Sun03Icon,
    Moon02Icon,
    SunsetIcon,
    FuelStationIcon,
    UserIcon,
    CheckmarkCircle02Icon,
    Alert02Icon,
    Loading03Icon
} from "@hugeicons/core-free-icons"
import { trpc } from "@/lib/trpc"
import { ShiftType } from "@prisma/client"
import { useAuth } from "@/lib/auth-context"
import { toast } from "sonner"

interface CreateShiftDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: (shiftId: number) => void
}

function getDefaultShiftType(): ShiftType {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 14) return ShiftType.MORNING
    if (hour >= 14 && hour < 22) return ShiftType.EVENING
    return ShiftType.NIGHT
}

export function CreateShiftDialog({
    open,
    onOpenChange,
    onSuccess
}: CreateShiftDialogProps) {
    const { user: currentUser } = useAuth()
    const utils = trpc.useUtils()

    const [selectedStaffId, setSelectedStaffId] = useState<string>("")
    const [shiftType, setShiftType] = useState<ShiftType>(getDefaultShiftType())
    const [selectedNozzleIds, setSelectedNozzleIds] = useState<number[]>([])

    // Data queries
    const activeStaffQuery = trpc.user.getActiveStaff.useQuery(undefined, {
        enabled: open,
    })
    const activeShiftsQuery = trpc.shift.getActiveShifts.useQuery(undefined, {
        enabled: open,
    })
    const availableNozzlesQuery = trpc.nozzle.getAvailable.useQuery(undefined, {
        enabled: open,
    })

    const staffList = activeStaffQuery.data || []
    const availableNozzles = availableNozzlesQuery.data || []
    const activeShifts = activeShiftsQuery.data || []

    // Set of user IDs that currently have an active shift
    const busyUserIds = new Set(activeShifts.map(s => s.user.id))

    // Set default staff member when dialog opens
    useEffect(() => {
        if (open) {
            setShiftType(getDefaultShiftType())
            setSelectedNozzleIds([])

            if (currentUser && !busyUserIds.has(currentUser.id)) {
                setSelectedStaffId(currentUser.id.toString())
            } else {
                const firstAvailable = staffList.find(s => !busyUserIds.has(s.id))
                if (firstAvailable) {
                    setSelectedStaffId(firstAvailable.id.toString())
                } else if (staffList.length > 0) {
                    setSelectedStaffId(staffList[0].id.toString())
                }
            }
        }
    }, [open, currentUser, staffList.length])

    const startShiftMutation = trpc.shift.start.useMutation({
        onSuccess: (data) => {
            const assignedStaff = staffList.find(s => s.id.toString() === selectedStaffId)
            const staffName = assignedStaff?.name || assignedStaff?.username || "Staff"
            toast.success(`Shift started successfully for ${staffName}`)

            utils.shift.getActiveShifts.invalidate()
            utils.shift.getActive.invalidate()
            utils.nozzle.getAvailable.invalidate()
            utils.nozzle.getAll.invalidate()

            onOpenChange(false)
            if (onSuccess) {
                onSuccess(data.id)
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to start shift")
        }
    })

    const toggleNozzle = (nozzleId: number) => {
        setSelectedNozzleIds(prev =>
            prev.includes(nozzleId)
                ? prev.filter(id => id !== nozzleId)
                : [...prev, nozzleId]
        )
    }

    const selectAllNozzles = () => {
        setSelectedNozzleIds(availableNozzles.map(n => n.id))
    }

    const clearNozzleSelection = () => {
        setSelectedNozzleIds([])
    }

    const handleSubmit = () => {
        if (!selectedStaffId) {
            toast.error("Please select a staff member")
            return
        }
        if (!shiftType) {
            toast.error("Please select a shift type")
            return
        }
        if (selectedNozzleIds.length === 0) {
            toast.error("Please select at least one nozzle")
            return
        }

        startShiftMutation.mutate({
            shiftType,
            nozzleIds: selectedNozzleIds,
            userId: parseInt(selectedStaffId),
        })
    }

    const isStaffBusy = selectedStaffId ? busyUserIds.has(parseInt(selectedStaffId)) : false

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <HugeiconsIcon icon={FuelStationIcon} className="h-5 w-5 text-primary" />
                        Start New Shift
                    </DialogTitle>
                    <DialogDescription>
                        Assign an attendant, shift time, and active nozzles to start a new shift.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-2">
                    {/* Staff Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="staff-select" className="flex items-center gap-1.5 font-medium">
                            <HugeiconsIcon icon={UserIcon} className="h-4 w-4 text-muted-foreground" />
                            Select Staff / Attendant <span className="text-destructive">*</span>
                        </Label>
                        {activeStaffQuery.isLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                <Spinner className="size-4" /> Loading staff members...
                            </div>
                        ) : (
                            <Select
                                value={selectedStaffId}
                                onValueChange={setSelectedStaffId}
                            >
                                <SelectTrigger id="staff-select" className="w-full">
                                    <SelectValue placeholder="Select staff member" />
                                </SelectTrigger>
                                <SelectContent>
                                    {staffList.map((st) => {
                                        const hasActive = busyUserIds.has(st.id)
                                        return (
                                            <SelectItem
                                                key={st.id}
                                                value={st.id.toString()}
                                                disabled={hasActive}
                                            >
                                                <div className="flex items-center justify-between w-full gap-3">
                                                    <span>
                                                        {st.name ? `${st.name} (${st.username})` : st.username}
                                                    </span>
                                                    <div className="flex items-center gap-1.5 ml-auto">
                                                        <span className="text-xs text-muted-foreground font-normal">
                                                            {st.role.name}
                                                        </span>
                                                        {hasActive && (
                                                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                                                                Active Shift
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                            </SelectItem>
                                        )
                                    })}
                                </SelectContent>
                            </Select>
                        )}
                        {isStaffBusy && (
                            <p className="text-xs text-destructive">
                                This staff member already has an active shift in progress.
                            </p>
                        )}
                    </div>

                    {/* Shift Type Selection */}
                    <div className="space-y-2">
                        <Label className="font-medium">Shift Type <span className="text-destructive">*</span></Label>
                        <Tabs
                            value={shiftType}
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

                    {/* Nozzles Selection */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-medium">
                                Assign Nozzles <span className="text-destructive">*</span>
                                {selectedNozzleIds.length > 0 && (
                                    <span className="text-xs font-normal text-muted-foreground ml-2">
                                        ({selectedNozzleIds.length} selected)
                                    </span>
                                )}
                            </Label>
                            {availableNozzles.length > 0 && (
                                <div className="flex items-center gap-2">
                                    {selectedNozzleIds.length !== availableNozzles.length ? (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs px-2"
                                            onClick={selectAllNozzles}
                                        >
                                            Select All
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs px-2 text-muted-foreground"
                                            onClick={clearNozzleSelection}
                                        >
                                            Deselect All
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>

                        {availableNozzlesQuery.isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Spinner className="size-5" />
                            </div>
                        ) : availableNozzles.length === 0 ? (
                            <Alert className="bg-muted/50">
                                <HugeiconsIcon icon={Alert02Icon} className="h-4 w-4 text-muted-foreground" />
                                <AlertDescription className="text-sm text-muted-foreground">
                                    No nozzles are currently available. All nozzles may be assigned to other active shifts.
                                </AlertDescription>
                            </Alert>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1">
                                {availableNozzles.map((nozzle) => {
                                    const isSelected = selectedNozzleIds.includes(nozzle.id)
                                    return (
                                        <div
                                            key={nozzle.id}
                                            onClick={() => toggleNozzle(nozzle.id)}
                                            className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all select-none relative ${isSelected
                                                ? "border-primary bg-primary/10 shadow-sm"
                                                : "border-border bg-card hover:bg-accent/50"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="font-semibold text-sm">
                                                    {nozzle.code}
                                                </div>
                                                {isSelected && (
                                                    <HugeiconsIcon icon={CheckmarkCircle02Icon} className="h-4 w-4 text-primary shrink-0" />
                                                )}
                                            </div>
                                            <div className="text-xs font-medium text-muted-foreground truncate mt-0.5">
                                                {nozzle.fuel.name}
                                            </div>
                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1.5 pt-1.5 border-t border-dashed">
                                                <span className="truncate">{nozzle.dispenser.name}</span>
                                                <span className="font-mono">#{Number(nozzle.currentreading).toFixed(1)}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={startShiftMutation.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSubmit}
                        disabled={
                            startShiftMutation.isPending ||
                            !selectedStaffId ||
                            isStaffBusy ||
                            selectedNozzleIds.length === 0
                        }
                    >
                        {startShiftMutation.isPending ? (
                            <>
                                <HugeiconsIcon icon={Loading03Icon} className="mr-2 h-4 w-4 animate-spin" />
                                Starting Shift...
                            </>
                        ) : (
                            "Start Shift"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
