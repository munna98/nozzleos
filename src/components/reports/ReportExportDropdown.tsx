"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { FileSpreadsheet, FileText, Download, ChevronDown } from "lucide-react"
import { toast } from "sonner"

interface ReportExportDropdownProps {
    onExportExcel: () => Promise<void> | void
    onExportPdf?: () => Promise<void> | void
    isExporting?: boolean
    label?: string
    className?: string
    align?: "start" | "end" | "center"
}

export function ReportExportDropdown({
    onExportExcel,
    onExportPdf,
    isExporting = false,
    label = "Export",
    className = "",
    align = "end",
}: ReportExportDropdownProps) {
    const handlePdfClick = () => {
        if (onExportPdf) {
            onExportPdf()
        } else {
            toast.info("PDF export option will be enabled in the upcoming PDF update.")
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    disabled={isExporting}
                    className={`gap-1.5 h-9 font-medium shadow-xs ${className}`}
                >
                    {isExporting ? (
                        <>
                            <Spinner className="h-3.5 w-3.5" />
                            <span>Exporting...</span>
                        </>
                    ) : (
                        <>
                            <Download className="h-4 w-4 text-muted-foreground" />
                            <span>{label}</span>
                            <ChevronDown className="h-3.5 w-3.5 opacity-60 ml-0.5" />
                        </>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={align} className="w-56">
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                    Export Report Data
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    onClick={onExportExcel}
                    disabled={isExporting}
                    className="flex items-center gap-2.5 cursor-pointer py-2"
                >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">Export to Excel</span>
                        <span className="text-[11px] text-muted-foreground">Spreadsheet (.xlsx)</span>
                    </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={handlePdfClick}
                    disabled={isExporting}
                    className="flex items-center gap-2.5 cursor-pointer py-2"
                >
                    <FileText className="h-4 w-4 text-rose-500" />
                    <div className="flex flex-col">
                        <span className="font-medium text-sm">Export to PDF</span>
                        <span className="text-[11px] text-muted-foreground">Printable document (.pdf)</span>
                    </div>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
