"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AmountTapeProps {
    /** Called with the running total every time chips change */
    onChange: (total: number) => void
    /** If provided, the tape starts with one chip equal to this value (edit mode) */
    initialAmount?: number
    /** Pass a signal key — when it changes the tape resets (e.g. when form resets) */
    resetKey?: string | number
}

interface Chip {
    id: number
    value: number
}

let nextId = 1

export function AmountTape({ onChange, initialAmount, resetKey }: AmountTapeProps) {
    const [chips, setChips] = useState<Chip[]>(() => {
        if (initialAmount && initialAmount > 0) {
            return [{ id: nextId++, value: initialAmount }]
        }
        return []
    })
    const [inputVal, setInputVal] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)

    // Reset when resetKey changes
    useEffect(() => {
        setChips(
            initialAmount && initialAmount > 0
                ? [{ id: nextId++, value: initialAmount }]
                : []
        )
        setInputVal("")
    }, [resetKey]) // intentionally excludes initialAmount to avoid re-triggering on parent re-renders

    // Fire onChange whenever chips change
    useEffect(() => {
        const total = chips.reduce((sum, c) => sum + c.value, 0)
        onChange(total)
    }, [chips, onChange])

    const addChip = useCallback(() => {
        const num = parseFloat(inputVal)
        if (!inputVal.trim() || isNaN(num) || num <= 0) {
            setInputVal("")
            inputRef.current?.focus()
            return
        }
        setChips(prev => [...prev, { id: nextId++, value: num }])
        setInputVal("")
        inputRef.current?.focus()
    }, [inputVal])

    const removeChip = useCallback((id: number) => {
        setChips(prev => prev.filter(c => c.id !== id))
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault()
            addChip()
        }
    }

    const total = chips.reduce((sum, c) => sum + c.value, 0)

    return (
        <div className="space-y-2">
            {/* Input row */}
            <div className="flex gap-2">
                <Input
                    ref={inputRef}
                    type="number"
                    inputMode="decimal"
                    placeholder="Enter amount"
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-12 text-lg"
                    style={{ fontSize: "1.125rem" }} // 18px — prevents iOS zoom
                    autoComplete="off"
                />
                <Button
                    type="button"
                    className="h-12 px-5 text-base font-semibold shrink-0"
                    onMouseDown={e => e.preventDefault()} // keep focus on input
                    onClick={addChip}
                >
                    + Add
                </Button>
            </div>

            {/* Chips */}
            {chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 py-1">
                    {chips.map(chip => (
                        <button
                            key={chip.id}
                            type="button"
                            onClick={() => removeChip(chip.id)}
                            className="inline-flex items-center gap-1 rounded-full border bg-muted px-3 py-1 text-sm font-medium transition-colors hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive active:scale-95"
                            title="Tap to remove"
                        >
                            ₹{chip.value.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            <span className="text-muted-foreground text-xs leading-none">×</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Footer */}
            {chips.length > 0 && (
                <div className="flex items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                        {chips.length} {chips.length === 1 ? "item" : "items"}
                    </span>
                    <span className="font-bold text-primary text-base">
                        ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
            )}
        </div>
    )
}
