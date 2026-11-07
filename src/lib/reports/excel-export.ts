import ExcelJS from "exceljs"
import { format } from "date-fns"

// Standard styling constants
const HEADER_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "1E3A8A" }, // Deep Navy
}

const HEADER_FONT: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 11,
    bold: true,
    color: { argb: "FFFFFF" },
}

const TOTAL_ROW_FILL: ExcelJS.Fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "F1F5F9" }, // Slate 100
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "CBD5E1" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    bottom: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } },
}

const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "94A3B8" } },
    bottom: { style: "double", color: { argb: "475569" } },
    left: { style: "thin", color: { argb: "CBD5E1" } },
    right: { style: "thin", color: { argb: "CBD5E1" } },
}

export const CURRENCY_FMT = '"₹"#,##0.00'
export const QTY_FMT = '#,##0.00'
export const INT_FMT = '#,##0'
export const PERCENT_FMT = '0.0%'

/**
 * Utility to auto-fit worksheet column widths specifically for data rows
 * Skips the report title / meta rows (1-4) and merged summary rows so they don't bloat column widths
 */
function autoFitColumns(
    worksheet: ExcelJS.Worksheet,
    startRow = 5,
    customWidths?: Record<number, number>
) {
    worksheet.columns.forEach((column, index) => {
        const colNum = index + 1
        let maxLen = 0

        if (column && column.eachCell) {
            column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
                // Ignore title, subtitle, and metadata rows (rows 1-4)
                if (rowNumber < startRow) return
                // Ignore merged cells (like summary label merged across columns A-G)
                if (cell.isMerged) return

                const cellVal = cell.value
                let strVal = ""
                if (cellVal !== null && cellVal !== undefined) {
                    if (typeof cellVal === "object" && "text" in cellVal) {
                        strVal = String((cellVal as any).text)
                    } else if (cellVal instanceof Date) {
                        strVal = format(cellVal, "dd-MMM-yyyy")
                    } else if (typeof cellVal === "number") {
                        strVal = cellVal.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                    } else {
                        strVal = String(cellVal)
                    }
                }
                if (strVal.length > maxLen) {
                    maxLen = strVal.length
                }
            })
        }

        // Base width calculation: max character length + padding
        let calculatedWidth = Math.max(maxLen + 3, 6)

        // Apply custom override if defined
        if (customWidths && customWidths[colNum]) {
            calculatedWidth = Math.max(calculatedWidth, customWidths[colNum])
        }

        // Cap at reasonable maximum (e.g. 26) so columns stay compact and readable
        column.width = Math.min(calculatedWidth, 26)
    })
}

/**
 * Trigger browser file download from workbook
 */
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string) {
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
}

/**
 * Add standard report header block
 */
function addReportHeader(
    sheet: ExcelJS.Worksheet,
    title: string,
    filterInfo: string,
    totalCols: number
) {
    // Row 1: Title
    const titleRow = sheet.addRow([title])
    titleRow.font = { name: "Calibri", size: 16, bold: true, color: { argb: "1E3A8A" } }
    sheet.mergeCells(1, 1, 1, totalCols)

    // Row 2: Subtitle
    const subRow = sheet.addRow(["NozzleOS Station Management Report"])
    subRow.font = { name: "Calibri", size: 10, italic: true, color: { argb: "64748B" } }
    sheet.mergeCells(2, 1, 2, totalCols)

    // Row 3: Filter info & timestamp
    const metaRow = sheet.addRow([
        `${filterInfo}  |  Generated on: ${format(new Date(), "dd-MMM-yyyy hh:mm a")}`,
    ])
    metaRow.font = { name: "Calibri", size: 9, color: { argb: "475569" } }
    sheet.mergeCells(3, 1, 3, totalCols)

    // Row 4: Spacer
    sheet.addRow([])
}

// ==========================================
// 1. PAYMENTS REPORT EXCEL EXPORT
// ==========================================
export interface PaymentExportParams {
    transactions: any[]
    summary?: {
        totalAmount: number
        totalCount: number
        byMethod?: Array<{
            name: string
            amount: number
            count: number
            percentage: number
        }>
    }
    dateRangeLabel?: string
    attendantLabel?: string
    paymentMethodLabel?: string
}

export async function exportPaymentsReport(params: PaymentExportParams) {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "NozzleOS"
    workbook.created = new Date()

    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Method: ${
        params.paymentMethodLabel || "All"
    }  |  Attendant: ${params.attendantLabel || "All"}`

    // Sheet 1: Detailed Transactions
    const txSheet = workbook.addWorksheet("Transactions", {
        views: [{ showGridLines: true }],
    })
    addReportHeader(txSheet, "Payment Transactions Report", filterText, 9)

    // Table Headers
    const headerRow = txSheet.addRow([
        "#",
        "Date",
        "Time",
        "Attendant",
        "Shift Type",
        "Payment Method",
        "Staff / Ref",
        "Nozzles",
        "Amount (₹)",
    ])
    headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    headerRow.getCell(9).alignment = { vertical: "middle", horizontal: "right" }
    headerRow.height = 24

    let totalAmount = 0
    params.transactions.forEach((tx, idx) => {
        const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date()
        const amt = Number(tx.amount || 0)
        totalAmount += amt

        const attendantName = tx.dutySession?.user?.name || tx.dutySession?.user?.username || "—"
        const shiftType = tx.dutySession?.type
            ? tx.dutySession.type.charAt(0).toUpperCase() + tx.dutySession.type.slice(1).toLowerCase()
            : "Shift"
        const methodName = tx.paymentMethod?.name || "—"
        const staffRef = tx.staff ? (tx.staff.name || tx.staff.username) : "—"
        const nozzles = (tx.dutySession?.nozzleReadings || [])
            .map((nr: any) => nr.nozzle?.code)
            .filter(Boolean)
            .join(", ") || "—"

        const row = txSheet.addRow([
            idx + 1,
            format(txDate, "dd-MMM-yyyy"),
            format(txDate, "hh:mm a"),
            attendantName,
            shiftType,
            methodName,
            staffRef,
            nozzles,
            amt,
        ])

        row.eachCell((cell, colNumber) => {
            cell.border = THIN_BORDER
            cell.font = { name: "Calibri", size: 10 }
            if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 5) {
                cell.alignment = { horizontal: "center" }
            } else if (colNumber === 9) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            } else {
                cell.alignment = { horizontal: "left" }
            }
        })
    })

    // Totals Row
    const summaryRow = txSheet.addRow([
        "Total",
        "",
        "",
        "",
        "",
        "",
        "",
        `${params.transactions.length} txns`,
        totalAmount,
    ])
    summaryRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11, bold: true }
        cell.fill = TOTAL_ROW_FILL
        cell.border = DOUBLE_BOTTOM_BORDER
        if (colNumber === 9) {
            cell.numFmt = CURRENCY_FMT
            cell.alignment = { horizontal: "right" }
        }
    })
    txSheet.mergeCells(summaryRow.number, 1, summaryRow.number, 7)
    summaryRow.height = 22

    autoFitColumns(txSheet, 5, {
        1: 6,   // #
        2: 13,  // Date
        3: 11,  // Time
        4: 16,  // Attendant
        5: 12,  // Shift Type
        6: 15,  // Payment Method
        7: 14,  // Staff / Ref
        8: 12,  // Nozzles
        9: 15,  // Amount
    })

    // Sheet 2: Method Summary
    if (params.summary?.byMethod && params.summary.byMethod.length > 0) {
        const methodSheet = workbook.addWorksheet("Method Summary", {
            views: [{ showGridLines: true }],
        })
        addReportHeader(methodSheet, "Payment Summary By Method", filterText, 4)

        const mHeader = methodSheet.addRow([
            "Payment Method",
            "Transactions",
            "Total Amount (₹)",
            "% Share",
        ])
        mHeader.eachCell((cell) => {
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.border = THIN_BORDER
            cell.alignment = { vertical: "middle", horizontal: "center" }
        })
        mHeader.getCell(3).alignment = { vertical: "middle", horizontal: "right" }
        mHeader.getCell(4).alignment = { vertical: "middle", horizontal: "right" }
        mHeader.height = 24

        let mCountTotal = 0
        let mAmtTotal = 0

        params.summary.byMethod.forEach((m) => {
            mCountTotal += m.count
            mAmtTotal += m.amount
            const mRow = methodSheet.addRow([
                m.name,
                m.count,
                m.amount,
                m.percentage / 100,
            ])
            mRow.eachCell((cell, colNumber) => {
                cell.border = THIN_BORDER
                cell.font = { name: "Calibri", size: 10 }
                if (colNumber === 2) {
                    cell.numFmt = INT_FMT
                    cell.alignment = { horizontal: "center" }
                } else if (colNumber === 3) {
                    cell.numFmt = CURRENCY_FMT
                    cell.alignment = { horizontal: "right" }
                } else if (colNumber === 4) {
                    cell.numFmt = PERCENT_FMT
                    cell.alignment = { horizontal: "right" }
                }
            })
        })

        const mTotalRow = methodSheet.addRow([
            "Total",
            mCountTotal,
            mAmtTotal,
            1,
        ])
        mTotalRow.eachCell((cell, colNumber) => {
            cell.font = { name: "Calibri", size: 11, bold: true }
            cell.fill = TOTAL_ROW_FILL
            cell.border = DOUBLE_BOTTOM_BORDER
            if (colNumber === 2) {
                cell.numFmt = INT_FMT
                cell.alignment = { horizontal: "center" }
            } else if (colNumber === 3) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 4) {
                cell.numFmt = PERCENT_FMT
                cell.alignment = { horizontal: "right" }
            }
        })
        mTotalRow.height = 22
        autoFitColumns(methodSheet, 5, {
            1: 18,  // Payment Method
            2: 13,  // Transactions
            3: 16,  // Total Amount
            4: 12,  // % Share
        })
    }

    const filename = `Payments_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    await downloadWorkbook(workbook, filename)
}

// ==========================================
// 2. PRODUCT SALES REPORT EXCEL EXPORT
// ==========================================
export interface ProductSalesExportParams {
    byProduct: any[]
    byGroup: any[]
    transactions?: any[]
    summary?: {
        totalSalesAmount: number
        totalQuantity: number
        transactionCount: number
        uniqueProductsCount: number
        topProduct?: any
    }
    dateRangeLabel?: string
    categoryLabel?: string
    productLabel?: string
    attendantLabel?: string
}

export async function exportProductSalesReport(params: ProductSalesExportParams) {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "NozzleOS"
    workbook.created = new Date()

    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Category: ${
        params.categoryLabel || "All"
    }  |  Product: ${params.productLabel || "All"}  |  Attendant: ${params.attendantLabel || "All"}`

    // Sheet 1: By Product Breakdown
    const prodSheet = workbook.addWorksheet("By Product", { views: [{ showGridLines: true }] })
    addReportHeader(prodSheet, "Product Sales Summary - By Product", filterText, 7)

    const pHeader = prodSheet.addRow([
        "Code",
        "Product Name",
        "Category",
        "Quantity Sold",
        "Avg Rate (₹)",
        "Total Revenue (₹)",
        "% Share",
    ])
    pHeader.eachCell((cell) => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    pHeader.getCell(4).alignment = { vertical: "middle", horizontal: "right" }
    pHeader.getCell(5).alignment = { vertical: "middle", horizontal: "right" }
    pHeader.getCell(6).alignment = { vertical: "middle", horizontal: "right" }
    pHeader.getCell(7).alignment = { vertical: "middle", horizontal: "right" }
    pHeader.height = 24

    let totalQty = 0
    let totalAmt = 0

    params.byProduct.forEach((p) => {
        const qty = Number(p.quantity || 0)
        const amt = Number(p.amount || 0)
        totalQty += qty
        totalAmt += amt

        const row = prodSheet.addRow([
            p.code,
            p.name,
            p.group,
            qty,
            Number(p.averagePrice || 0),
            amt,
            (Number(p.percentage || 0)) / 100,
        ])

        row.eachCell((cell, colNumber) => {
            cell.border = THIN_BORDER
            cell.font = { name: "Calibri", size: 10 }
            if (colNumber === 1 || colNumber === 3) {
                cell.alignment = { horizontal: "center" }
            } else if (colNumber === 4) {
                cell.numFmt = QTY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 5 || colNumber === 6) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 7) {
                cell.numFmt = PERCENT_FMT
                cell.alignment = { horizontal: "right" }
            }
        })
    })

    const pTotalRow = prodSheet.addRow([
        "Total",
        "",
        "",
        totalQty,
        "",
        totalAmt,
        1,
    ])
    pTotalRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11, bold: true }
        cell.fill = TOTAL_ROW_FILL
        cell.border = DOUBLE_BOTTOM_BORDER
        if (colNumber === 4) {
            cell.numFmt = QTY_FMT
            cell.alignment = { horizontal: "right" }
        } else if (colNumber === 6) {
            cell.numFmt = CURRENCY_FMT
            cell.alignment = { horizontal: "right" }
        } else if (colNumber === 7) {
            cell.numFmt = PERCENT_FMT
            cell.alignment = { horizontal: "right" }
        }
    })
    prodSheet.mergeCells(pTotalRow.number, 1, pTotalRow.number, 3)
    pTotalRow.height = 22
    autoFitColumns(prodSheet, 5, {
        1: 10,  // Code
        2: 20,  // Product Name
        3: 13,  // Category
        4: 14,  // Quantity Sold
        5: 12,  // Avg Rate
        6: 15,  // Total Revenue
        7: 11,  // % Share
    })

    // Sheet 2: By Category Breakdown
    const catSheet = workbook.addWorksheet("By Category", { views: [{ showGridLines: true }] })
    addReportHeader(catSheet, "Product Sales Summary - By Category", filterText, 5)

    const cHeader = catSheet.addRow([
        "Category / Group",
        "Units Sold",
        "Sales Entries",
        "Total Revenue (₹)",
        "% Contribution",
    ])
    cHeader.eachCell((cell) => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    cHeader.height = 24

    let catQtyTotal = 0
    let catEntriesTotal = 0
    let catAmtTotal = 0

    params.byGroup.forEach((g) => {
        const qty = Number(g.quantity || 0)
        const entries = Number(g.salesCount || 0)
        const amt = Number(g.amount || 0)
        catQtyTotal += qty
        catEntriesTotal += entries
        catAmtTotal += amt

        const row = catSheet.addRow([
            g.group,
            qty,
            entries,
            amt,
            (Number(g.percentage || 0)) / 100,
        ])

        row.eachCell((cell, colNumber) => {
            cell.border = THIN_BORDER
            cell.font = { name: "Calibri", size: 10 }
            if (colNumber === 2) {
                cell.numFmt = QTY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 3) {
                cell.numFmt = INT_FMT
                cell.alignment = { horizontal: "center" }
            } else if (colNumber === 4) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 5) {
                cell.numFmt = PERCENT_FMT
                cell.alignment = { horizontal: "right" }
            }
        })
    })

    const cTotalRow = catSheet.addRow([
        "Total",
        catQtyTotal,
        catEntriesTotal,
        catAmtTotal,
        1,
    ])
    cTotalRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11, bold: true }
        cell.fill = TOTAL_ROW_FILL
        cell.border = DOUBLE_BOTTOM_BORDER
        if (colNumber === 2) {
            cell.numFmt = QTY_FMT
            cell.alignment = { horizontal: "right" }
        } else if (colNumber === 3) {
            cell.numFmt = INT_FMT
            cell.alignment = { horizontal: "center" }
        } else if (colNumber === 4) {
            cell.numFmt = CURRENCY_FMT
            cell.alignment = { horizontal: "right" }
        } else if (colNumber === 5) {
            cell.numFmt = PERCENT_FMT
            cell.alignment = { horizontal: "right" }
        }
    })
    cTotalRow.height = 22
    autoFitColumns(catSheet, 5, {
        1: 18,  // Category / Group
        2: 13,  // Units Sold
        3: 13,  // Sales Entries
        4: 16,  // Total Revenue
        5: 14,  // % Contribution
    })

    // Sheet 3: Sales Log (if provided)
    if (params.transactions && params.transactions.length > 0) {
        const logSheet = workbook.addWorksheet("Sales Log", { views: [{ showGridLines: true }] })
        addReportHeader(logSheet, "Product Sales Detailed Log", filterText, 10)

        const lHeader = logSheet.addRow([
            "#",
            "Date",
            "Time",
            "Shift",
            "Attendant",
            "Code",
            "Product Name",
            "Quantity",
            "Rate (₹)",
            "Amount (₹)",
        ])
        lHeader.eachCell((cell) => {
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.border = THIN_BORDER
            cell.alignment = { vertical: "middle", horizontal: "center" }
        })
        lHeader.height = 24

        let logQtyTotal = 0
        let logAmtTotal = 0

        params.transactions.forEach((tx, idx) => {
            const txDate = tx.createdAt ? new Date(tx.createdAt) : new Date()
            const qty = Number(tx.quantity || 0)
            const amt = Number(tx.amount || 0)
            logQtyTotal += qty
            logAmtTotal += amt

            const shiftType = tx.dutySession?.type
                ? tx.dutySession.type.charAt(0).toUpperCase() + tx.dutySession.type.slice(1).toLowerCase()
                : "Shift"
            const attendant = tx.dutySession?.user?.name || tx.dutySession?.user?.username || "—"
            const unit = tx.product?.unit ? ` ${tx.product.unit}` : ""

            const row = logSheet.addRow([
                idx + 1,
                format(txDate, "dd-MMM-yyyy"),
                format(txDate, "hh:mm a"),
                shiftType,
                attendant,
                tx.product?.code || "—",
                tx.product?.name || "—",
                qty,
                Number(tx.price || 0),
                amt,
            ])

            row.eachCell((cell, colNumber) => {
                cell.border = THIN_BORDER
                cell.font = { name: "Calibri", size: 10 }
                if (colNumber === 1 || colNumber === 2 || colNumber === 3 || colNumber === 4 || colNumber === 6) {
                    cell.alignment = { horizontal: "center" }
                } else if (colNumber === 8) {
                    cell.numFmt = QTY_FMT
                    cell.alignment = { horizontal: "right" }
                } else if (colNumber === 9 || colNumber === 10) {
                    cell.numFmt = CURRENCY_FMT
                    cell.alignment = { horizontal: "right" }
                }
            })
        })

        const lTotalRow = logSheet.addRow([
            "Total",
            "",
            "",
            "",
            "",
            "",
            "",
            logQtyTotal,
            "",
            logAmtTotal,
        ])
        lTotalRow.eachCell((cell, colNumber) => {
            cell.font = { name: "Calibri", size: 11, bold: true }
            cell.fill = TOTAL_ROW_FILL
            cell.border = DOUBLE_BOTTOM_BORDER
            if (colNumber === 8) {
                cell.numFmt = QTY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 10) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            }
        })
        logSheet.mergeCells(lTotalRow.number, 1, lTotalRow.number, 7)
        lTotalRow.height = 22
        autoFitColumns(logSheet, 5, {
            1: 6,   // #
            2: 13,  // Date
            3: 11,  // Time
            4: 12,  // Shift
            5: 16,  // Attendant
            6: 10,  // Code
            7: 20,  // Product Name
            8: 12,  // Quantity
            9: 12,  // Rate
            10: 15, // Amount
        })
    }

    const filename = `Product_Sales_Report_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    await downloadWorkbook(workbook, filename)
}

// ==========================================
// 3. SHIFT HISTORY REPORT EXCEL EXPORT
// ==========================================
export interface ShiftHistoryExportParams {
    shifts: any[]
    summary?: any
    dateRangeLabel?: string
    statusLabel?: string
    shiftTypeLabel?: string
    attendantLabel?: string
}

export async function exportShiftHistoryReport(params: ShiftHistoryExportParams) {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "NozzleOS"
    workbook.created = new Date()

    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Status: ${
        params.statusLabel || "All"
    }  |  Type: ${params.shiftTypeLabel || "All"}  |  Attendant: ${params.attendantLabel || "All"}`

    // Sheet 1: Shift History List
    const sheet = workbook.addWorksheet("Shift History", { views: [{ showGridLines: true }] })
    addReportHeader(sheet, "Shift History Report", filterText, 14)

    const headers = [
        "Shift ID",
        "Date",
        "Attendant",
        "Shift Type",
        "Start Time",
        "End Time",
        "Duration",
        "Status",
        "Nozzles",
        "Fuel Sales (₹)",
        "Product Sales (₹)",
        "Total Sales (₹)",
        "Collected (₹)",
        "Short / Excess (₹)",
    ]

    const headerRow = sheet.addRow(headers)
    headerRow.eachCell((cell) => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    for (let c = 10; c <= 14; c++) {
        headerRow.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
    }
    headerRow.height = 24

    let totalFuelSales = 0
    let totalProductSales = 0
    let totalSales = 0
    let totalCollected = 0
    let totalDifference = 0

    // Detailed readings for Sheet 2
    const allReadings: any[] = []

    params.shifts.forEach((s) => {
        const startDate = s.startTime ? new Date(s.startTime) : null
        const endDate = s.endTime ? new Date(s.endTime) : null

        let durationStr = "In Progress"
        if (startDate && endDate) {
            const diffMs = endDate.getTime() - startDate.getTime()
            const hrs = Math.floor(diffMs / (1000 * 60 * 60))
            const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
            durationStr = `${hrs}h ${mins}m`
        }

        // Calculate fuel sales from nozzle readings
        let sFuelSales = 0
        const nozzleCodes: string[] = []
        if (s.nozzleReadings) {
            for (const r of s.nozzleReadings) {
                const dispensed = Number(r.fuelDispensed || 0)
                const price = Number((r as any).fuelPrice && Number((r as any).fuelPrice) > 0 ? (r as any).fuelPrice : r.nozzle?.price || 0)
                const amt = dispensed * price
                sFuelSales += amt
                if (r.nozzle?.code) {
                    nozzleCodes.push(r.nozzle.code)
                }

                allReadings.push({
                    shiftId: s.id,
                    attendant: s.user?.name || s.user?.username || "—",
                    date: startDate ? format(startDate, "dd-MMM-yyyy") : "—",
                    shiftType: s.type || "Shift",
                    nozzle: r.nozzle?.code || "—",
                    fuel: r.nozzle?.fuel?.name || "—",
                    opening: Number(r.openingReading || 0),
                    closing: r.closingReading !== null ? Number(r.closingReading) : null,
                    dispensed,
                    price,
                    amount: amt,
                })
            }
        }

        // Product sales
        let sProdSales = 0
        if (s.sessionProducts) {
            for (const sp of s.sessionProducts) {
                sProdSales += Number(sp.amount || 0)
            }
        }

        const sTotalSales = sFuelSales + sProdSales
        const sCollected = Number(s.totalPaymentCollected || 0)
        const sDiff = sCollected - sTotalSales

        totalFuelSales += sFuelSales
        totalProductSales += sProdSales
        totalSales += sTotalSales
        totalCollected += sCollected
        totalDifference += sDiff

        const shiftTypeStr = s.type
            ? s.type.charAt(0).toUpperCase() + s.type.slice(1).toLowerCase()
            : "Shift"
        const statusStr = s.status
            ? s.status.replace("_", " ").toUpperCase()
            : "—"

        const row = sheet.addRow([
            s.id,
            startDate ? format(startDate, "dd-MMM-yyyy") : "—",
            s.user?.name || s.user?.username || "—",
            shiftTypeStr,
            startDate ? format(startDate, "hh:mm a") : "—",
            endDate ? format(endDate, "hh:mm a") : "—",
            durationStr,
            statusStr,
            nozzleCodes.join(", ") || "—",
            sFuelSales,
            sProdSales,
            sTotalSales,
            sCollected,
            sDiff,
        ])

        row.eachCell((cell, colNumber) => {
            cell.border = THIN_BORDER
            cell.font = { name: "Calibri", size: 10 }
            if ([1, 2, 4, 5, 6, 7, 8].includes(colNumber)) {
                cell.alignment = { horizontal: "center" }
            } else if (colNumber >= 10 && colNumber <= 14) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
                if (colNumber === 14) {
                    if (sDiff < -0.01) {
                        cell.font = { name: "Calibri", size: 10, color: { argb: "DC2626" } } // Red for shortage
                    } else if (sDiff > 0.01) {
                        cell.font = { name: "Calibri", size: 10, color: { argb: "16A34A" } } // Green for excess
                    }
                }
            }
        })
    })

    // Summary row
    const totalRow = sheet.addRow([
        "Total",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `${params.shifts.length} shifts`,
        totalFuelSales,
        totalProductSales,
        totalSales,
        totalCollected,
        totalDifference,
    ])
    totalRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11, bold: true }
        cell.fill = TOTAL_ROW_FILL
        cell.border = DOUBLE_BOTTOM_BORDER
        if (colNumber >= 10 && colNumber <= 14) {
            cell.numFmt = CURRENCY_FMT
            cell.alignment = { horizontal: "right" }
            if (colNumber === 14) {
                if (totalDifference < -0.01) {
                    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "DC2626" } }
                } else if (totalDifference > 0.01) {
                    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "16A34A" } }
                }
            }
        }
    })
    sheet.mergeCells(totalRow.number, 1, totalRow.number, 8)
    totalRow.height = 22
    autoFitColumns(sheet, 5, {
        1: 9,   // Shift ID
        2: 13,  // Date
        3: 16,  // Attendant
        4: 11,  // Shift Type
        5: 11,  // Start Time
        6: 11,  // End Time
        7: 11,  // Duration
        8: 12,  // Status
        9: 13,  // Nozzles
        10: 14, // Fuel Sales
        11: 14, // Product Sales
        12: 15, // Total Sales
        13: 14, // Collected
        14: 15, // Short / Excess
    })

    // Sheet 2: Nozzle Readings Breakdown
    if (allReadings.length > 0) {
        const rSheet = workbook.addWorksheet("Nozzle Readings", { views: [{ showGridLines: true }] })
        addReportHeader(rSheet, "Shift Nozzle Readings Detail", filterText, 11)

        const rHeaders = [
            "Shift ID",
            "Date",
            "Attendant",
            "Shift Type",
            "Nozzle",
            "Fuel Name",
            "Opening Reading",
            "Closing Reading",
            "Dispensed (L)",
            "Rate (₹)",
            "Amount (₹)",
        ]
        const rHeaderRow = rSheet.addRow(rHeaders)
        rHeaderRow.eachCell((cell) => {
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.border = THIN_BORDER
            cell.alignment = { vertical: "middle", horizontal: "center" }
        })
        rHeaderRow.height = 24

        let totalDispensedLiters = 0
        let totalReadingAmt = 0

        allReadings.forEach((r) => {
            totalDispensedLiters += r.dispensed
            totalReadingAmt += r.amount

            const row = rSheet.addRow([
                r.shiftId,
                r.date,
                r.attendant,
                r.shiftType,
                r.nozzle,
                r.fuel,
                r.opening,
                r.closing !== null ? r.closing : "—",
                r.dispensed,
                r.price,
                r.amount,
            ])

            row.eachCell((cell, colNumber) => {
                cell.border = THIN_BORDER
                cell.font = { name: "Calibri", size: 10 }
                if ([1, 2, 4, 5].includes(colNumber)) {
                    cell.alignment = { horizontal: "center" }
                } else if (colNumber === 7 || colNumber === 8 || colNumber === 9) {
                    cell.numFmt = QTY_FMT
                    cell.alignment = { horizontal: "right" }
                } else if (colNumber === 10 || colNumber === 11) {
                    cell.numFmt = CURRENCY_FMT
                    cell.alignment = { horizontal: "right" }
                }
            })
        })

        const rTotalRow = rSheet.addRow([
            "Total",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            totalDispensedLiters,
            "",
            totalReadingAmt,
        ])
        rTotalRow.eachCell((cell, colNumber) => {
            cell.font = { name: "Calibri", size: 11, bold: true }
            cell.fill = TOTAL_ROW_FILL
            cell.border = DOUBLE_BOTTOM_BORDER
            if (colNumber === 9) {
                cell.numFmt = QTY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 11) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            }
        })
        rSheet.mergeCells(rTotalRow.number, 1, rTotalRow.number, 8)
        rTotalRow.height = 22
        autoFitColumns(rSheet, 5, {
            1: 9,   // Shift ID
            2: 13,  // Date
            3: 16,  // Attendant
            4: 11,  // Shift Type
            5: 9,   // Nozzle
            6: 14,  // Fuel Name
            7: 15,  // Opening Reading
            8: 15,  // Closing Reading
            9: 14,  // Dispensed (L)
            10: 12, // Rate
            11: 14, // Amount
        })
    }

    const filename = `Shift_History_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    await downloadWorkbook(workbook, filename)
}

// ==========================================
// 4. STAFF PERFORMANCE REPORT EXCEL EXPORT
// ==========================================
export interface StaffReportExportParams {
    staff: any[]
    summary?: any
    dateRangeLabel?: string
    shiftTypeLabel?: string
    userLabel?: string
}

export async function exportStaffPerformanceReport(params: StaffReportExportParams) {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = "NozzleOS"
    workbook.created = new Date()

    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Shift Type: ${
        params.shiftTypeLabel || "All"
    }  |  Staff Member: ${params.userLabel || "All"}`

    // Sheet 1: Staff Performance Summary
    const sumSheet = workbook.addWorksheet("Staff Summary", { views: [{ showGridLines: true }] })
    addReportHeader(sumSheet, "Staff Performance Report - Summary", filterText, 9)

    const sumHeaders = [
        "Staff Name",
        "Total Shifts",
        "Duty Hours",
        "Fuel Sales (₹)",
        "Product Sales (₹)",
        "Total Sales (₹)",
        "Collected (₹)",
        "Difference (₹)",
        "Status",
    ]
    const sHeaderRow = sumSheet.addRow(sumHeaders)
    sHeaderRow.eachCell((cell) => {
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.border = THIN_BORDER
        cell.alignment = { vertical: "middle", horizontal: "center" }
    })
    for (let c = 4; c <= 8; c++) {
        sHeaderRow.getCell(c).alignment = { vertical: "middle", horizontal: "right" }
    }
    sHeaderRow.height = 24

    let totalShifts = 0
    let totalDutyHours = 0
    let totalFuelSales = 0
    let totalProductSales = 0
    let totalSales = 0
    let totalCollected = 0
    let totalDifference = 0

    // Detailed shifts array for Sheet 2
    const allDetailedShifts: any[] = []

    params.staff.forEach((st) => {
        const shiftsCount = st.shifts?.length || 0
        const dutyHrs = Number(st.totals?.totalDutyHours || 0)
        const fuelSales = Number(st.totals?.totalFuelSales || 0)
        const prodSales = Number(st.totals?.totalProductSales || 0)
        const sales = Number(st.totals?.totalSales || (fuelSales + prodSales))
        const collected = Number(st.totals?.totalPaymentsCollected || 0)
        const diff = Number(st.totals?.totalDifference || (collected - sales))

        totalShifts += shiftsCount
        totalDutyHours += dutyHrs
        totalFuelSales += fuelSales
        totalProductSales += prodSales
        totalSales += sales
        totalCollected += collected
        totalDifference += diff

        let statusText = "Settled"
        if (diff < -0.01) statusText = "Shortage"
        else if (diff > 0.01) statusText = "Excess"

        const row = sumSheet.addRow([
            st.userName,
            shiftsCount,
            dutyHrs,
            fuelSales,
            prodSales,
            sales,
            collected,
            diff,
            statusText,
        ])

        row.eachCell((cell, colNumber) => {
            cell.border = THIN_BORDER
            cell.font = { name: "Calibri", size: 10 }
            if (colNumber === 2 || colNumber === 9) {
                cell.alignment = { horizontal: "center" }
            } else if (colNumber === 3) {
                cell.numFmt = '#,##0.0"h"'
                cell.alignment = { horizontal: "right" }
            } else if (colNumber >= 4 && colNumber <= 8) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
                if (colNumber === 8) {
                    if (diff < -0.01) cell.font = { name: "Calibri", size: 10, color: { argb: "DC2626" } }
                    else if (diff > 0.01) cell.font = { name: "Calibri", size: 10, color: { argb: "16A34A" } }
                }
            }
        })

        // Collect shifts for Sheet 2
        if (st.shifts) {
            st.shifts.forEach((sh: any) => {
                allDetailedShifts.push({
                    staffName: st.userName,
                    ...sh,
                })
            })
        }
    })

    const sumTotalRow = sumSheet.addRow([
        "Total",
        totalShifts,
        totalDutyHours,
        totalFuelSales,
        totalProductSales,
        totalSales,
        totalCollected,
        totalDifference,
        "",
    ])
    sumTotalRow.eachCell((cell, colNumber) => {
        cell.font = { name: "Calibri", size: 11, bold: true }
        cell.fill = TOTAL_ROW_FILL
        cell.border = DOUBLE_BOTTOM_BORDER
        if (colNumber === 2) {
            cell.numFmt = INT_FMT
            cell.alignment = { horizontal: "center" }
        } else if (colNumber === 3) {
            cell.numFmt = '#,##0.0"h"'
            cell.alignment = { horizontal: "right" }
        } else if (colNumber >= 4 && colNumber <= 8) {
            cell.numFmt = CURRENCY_FMT
            cell.alignment = { horizontal: "right" }
            if (colNumber === 8) {
                if (totalDifference < -0.01) {
                    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "DC2626" } }
                } else if (totalDifference > 0.01) {
                    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "16A34A" } }
                }
            }
        }
    })
    sumTotalRow.height = 22
    autoFitColumns(sumSheet, 5, {
        1: 18,  // Staff Name
        2: 12,  // Total Shifts
        3: 12,  // Duty Hours
        4: 14,  // Fuel Sales
        5: 14,  // Product Sales
        6: 15,  // Total Sales
        7: 14,  // Collected
        8: 14,  // Difference
        9: 12,  // Status
    })

    // Sheet 2: Staff Detailed Shifts
    if (allDetailedShifts.length > 0) {
        const dSheet = workbook.addWorksheet("Shift Details", { views: [{ showGridLines: true }] })
        addReportHeader(dSheet, "Staff Shifts Detailed Log", filterText, 12)

        const dHeaders = [
            "Staff Member",
            "Shift ID",
            "Date",
            "Shift Type",
            "Start Time",
            "End Time",
            "Duty Hours",
            "Status",
            "Fuel Sales (₹)",
            "Product Sales (₹)",
            "Total Sales (₹)",
            "Collected (₹)",
            "Difference (₹)",
        ]
        const dHeaderRow = dSheet.addRow(dHeaders)
        dHeaderRow.eachCell((cell) => {
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.border = THIN_BORDER
            cell.alignment = { vertical: "middle", horizontal: "center" }
        })
        dHeaderRow.height = 24

        allDetailedShifts.forEach((sh) => {
            const startDate = sh.startTime ? new Date(sh.startTime) : null
            const endDate = sh.endTime ? new Date(sh.endTime) : null
            const diff = Number(sh.difference || 0)
            const typeStr = sh.type
                ? sh.type.charAt(0).toUpperCase() + sh.type.slice(1).toLowerCase()
                : "Shift"

            const row = dSheet.addRow([
                sh.staffName,
                sh.id,
                startDate ? format(startDate, "dd-MMM-yyyy") : "—",
                typeStr,
                startDate ? format(startDate, "hh:mm a") : "—",
                endDate ? format(endDate, "hh:mm a") : "—",
                Number(sh.dutyHours || 0),
                sh.status?.toUpperCase() || "—",
                Number(sh.totalFuelSales || 0),
                Number(sh.totalProductSales || 0),
                Number(sh.totalSales || 0),
                Number(sh.totalPaymentsCollected || 0),
                diff,
            ])

            row.eachCell((cell, colNumber) => {
                cell.border = THIN_BORDER
                cell.font = { name: "Calibri", size: 10 }
                if ([2, 3, 4, 5, 6, 8].includes(colNumber)) {
                    cell.alignment = { horizontal: "center" }
                } else if (colNumber === 7) {
                    cell.numFmt = '#,##0.0"h"'
                    cell.alignment = { horizontal: "right" }
                } else if (colNumber >= 9 && colNumber <= 13) {
                    cell.numFmt = CURRENCY_FMT
                    cell.alignment = { horizontal: "right" }
                    if (colNumber === 13) {
                        if (diff < -0.01) cell.font = { name: "Calibri", size: 10, color: { argb: "DC2626" } }
                        else if (diff > 0.01) cell.font = { name: "Calibri", size: 10, color: { argb: "16A34A" } }
                    }
                }
            })
        })

        autoFitColumns(dSheet, 5, {
            1: 18,  // Staff Member
            2: 10,  // Shift ID
            3: 13,  // Date
            4: 12,  // Shift Type
            5: 11,  // Start Time
            6: 11,  // End Time
            7: 11,  // Duty Hours
            8: 12,  // Status
            9: 14,  // Fuel Sales
            10: 14, // Product Sales
            11: 15, // Total Sales
            12: 14, // Collected
            13: 14, // Difference
        })
    }

    // Sheet 3: Fuel Breakdown (if available)
    if (params.summary?.fuelBreakdown && params.summary.fuelBreakdown.length > 0) {
        const fSheet = workbook.addWorksheet("Fuel Breakdown", { views: [{ showGridLines: true }] })
        addReportHeader(fSheet, "Overall Fuel Dispensed Breakdown", filterText, 3)

        const fHeaderRow = fSheet.addRow([
            "Fuel Name",
            "Dispensed Liters",
            "Total Sales Amount (₹)",
        ])
        fHeaderRow.eachCell((cell) => {
            cell.fill = HEADER_FILL
            cell.font = HEADER_FONT
            cell.border = THIN_BORDER
            cell.alignment = { vertical: "middle", horizontal: "center" }
        })
        fHeaderRow.height = 24

        let fLitersTotal = 0
        let fAmtTotal = 0

        params.summary.fuelBreakdown.forEach((fb: any) => {
            const liters = Number(fb.quantityInLiters || 0)
            const amt = Number(fb.amount || 0)
            fLitersTotal += liters
            fAmtTotal += amt

            const row = fSheet.addRow([fb.fuelName, liters, amt])
            row.eachCell((cell, colNumber) => {
                cell.border = THIN_BORDER
                cell.font = { name: "Calibri", size: 10 }
                if (colNumber === 2) {
                    cell.numFmt = QTY_FMT
                    cell.alignment = { horizontal: "right" }
                } else if (colNumber === 3) {
                    cell.numFmt = CURRENCY_FMT
                    cell.alignment = { horizontal: "right" }
                }
            })
        })

        const fTotalRow = fSheet.addRow([
            "Total",
            fLitersTotal,
            fAmtTotal,
        ])
        fTotalRow.eachCell((cell, colNumber) => {
            cell.font = { name: "Calibri", size: 11, bold: true }
            cell.fill = TOTAL_ROW_FILL
            cell.border = DOUBLE_BOTTOM_BORDER
            if (colNumber === 2) {
                cell.numFmt = QTY_FMT
                cell.alignment = { horizontal: "right" }
            } else if (colNumber === 3) {
                cell.numFmt = CURRENCY_FMT
                cell.alignment = { horizontal: "right" }
            }
        })
        fTotalRow.height = 22
        autoFitColumns(fSheet, 5, {
            1: 16,  // Fuel Name
            2: 16,  // Dispensed Liters
            3: 20,  // Total Sales Amount
        })
    }

    const filename = `Staff_Performance_${format(new Date(), "yyyyMMdd_HHmm")}.xlsx`
    await downloadWorkbook(workbook, filename)
}
