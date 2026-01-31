"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
    date?: Date
    setDate: (date?: Date) => void
    placeholder?: string
    className?: string
    disabled?: boolean
}

export function DateTimePicker({ date, setDate, placeholder = "Pick date & time", className, disabled }: DateTimePickerProps) {
    const [open, setOpen] = React.useState(false)

    const handleDateSelect = (selectedDate: Date | undefined) => {
        if (!selectedDate) {
            setDate(undefined)
            return
        }

        const newDate = new Date(selectedDate)
        if (date) {
            newDate.setHours(date.getHours())
            newDate.setMinutes(date.getMinutes())
        } else {
            newDate.setHours(0)
            newDate.setMinutes(0)
        }
        setDate(newDate)
    }

    const handleTimeChange = (timeStr: string) => {
        if (!timeStr) return
        const [hours, minutes] = timeStr.split(':').map(Number)

        const newDate = date ? new Date(date) : new Date()
        newDate.setHours(hours)
        newDate.setMinutes(minutes)
        setDate(newDate)
    }

    const timeValue = date ? format(date, "HH:mm") : "00:00"

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP p") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={handleDateSelect}
                    initialFocus
                />
                <div className="p-3 border-t flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Input
                        type="time"
                        value={timeValue}
                        onChange={(e) => handleTimeChange(e.target.value)}
                        className="h-8"
                    />
                </div>
            </PopoverContent>
        </Popover>
    )
}
