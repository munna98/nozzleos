import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import type {
    PaymentExportParams,
    ProductSalesExportParams,
    ShiftHistoryExportParams,
    StaffReportExportParams,
} from "./excel-export"

export interface PdfPaymentExportParams extends PaymentExportParams {
    activeTab?: "summary" | "transactions" | string
}

export interface PdfProductSalesExportParams extends ProductSalesExportParams {
    activeTab?: "by-product" | "by-group" | "transactions" | string
}

// Color Palette Constants
const NAVY_PRIMARY: [number, number, number] = [30, 58, 138] // #1E3A8A
const SLATE_DARK: [number, number, number] = [15, 23, 42] // #0F172A
const SLATE_MUTED: [number, number, number] = [100, 116, 139] // #64748B
const SLATE_LIGHT: [number, number, number] = [241, 245, 249] // #F1F5F9
const BORDER_COLOR: [number, number, number] = [203, 213, 225] // #CBD5E1
const GREEN_POSITIVE: [number, number, number] = [22, 163, 74] // #16A34A
const RED_NEGATIVE: [number, number, number] = [220, 38, 38] // #DC2626

// Formatting Helpers
function formatCurrency(val: number | null | undefined): string {
    const num = Number(val || 0)
    return `Rs. ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatNumber(val: number | null | undefined, decimals = 2): string {
    const num = Number(val || 0)
    return num.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

function formatDate(date: string | Date | null | undefined): string {
    if (!date) return "—"
    try {
        return format(new Date(date), "dd-MMM-yyyy")
    } catch {
        return "—"
    }
}

function formatTime(date: string | Date | null | undefined): string {
    if (!date) return "—"
    try {
        return format(new Date(date), "hh:mm a")
    } catch {
        return "—"
    }
}

// Styling definitions for tables
const COMMON_HEAD_STYLES = {
    fillColor: NAVY_PRIMARY,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 8,
    cellPadding: 2.2,
    lineColor: BORDER_COLOR,
    lineWidth: 0.1,
}

const COMMON_BODY_STYLES = {
    fontSize: 7.5,
    textColor: [30, 41, 59] as [number, number, number],
    cellPadding: 2,
    lineColor: BORDER_COLOR,
    lineWidth: 0.1,
}

const COMMON_ALT_ROW_STYLES = {
    fillColor: [248, 250, 252] as [number, number, number],
}

const COMMON_FOOT_STYLES = {
    fillColor: SLATE_LIGHT,
    textColor: SLATE_DARK,
    fontStyle: "bold" as const,
    fontSize: 8,
    lineColor: [148, 163, 184] as [number, number, number],
    lineWidth: { top: 0.3, bottom: 0.6 } as any,
    cellPadding: 2.5,
}

interface SummaryCard {
    label: string
    value: string
    color?: [number, number, number]
}

/**
 * Draw consistent brand header on page 1
 */
function drawReportHeader(
    doc: jsPDF,
    title: string,
    filterInfo: string,
    pageWidth: number,
    stationName?: string
): number {
    const margin = 14
    const displayName = (stationName || "NozzleOS Fuel Station").trim()

    // Top primary decorative accent line
    doc.setFillColor(...NAVY_PRIMARY)
    doc.rect(margin, 8, pageWidth - margin * 2, 1.8, "F")

    // Fuel Station Name
    doc.setFont("helvetica", "bold")
    doc.setFontSize(14.5)
    doc.setTextColor(...NAVY_PRIMARY)
    doc.text(displayName.toUpperCase(), margin, 17)

    // Subtitle
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8)
    doc.setTextColor(...SLATE_MUTED)
    doc.text("NozzleOS Station Management Report", margin, 21.5)

    // Generated Date & Time (Right aligned)
    const nowStr = `Generated: ${format(new Date(), "dd-MMM-yyyy, hh:mm a")}`
    doc.text(nowStr, pageWidth - margin, 17, { align: "right" })

    // Report Title
    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.setTextColor(...SLATE_DARK)
    doc.text(title.toUpperCase(), margin, 29)

    // Active Filters / Period metadata
    doc.setFont("helvetica", "normal")
    doc.setFontSize(7.8)
    doc.setTextColor(71, 85, 105)
    doc.text(filterInfo, margin, 34)

    // Divider line
    doc.setDrawColor(...BORDER_COLOR)
    doc.setLineWidth(0.3)
    doc.line(margin, 36.5, pageWidth - margin, 36.5)

    return 40 // Starting Y for subsequent content
}

/**
 * Draw executive KPI summary boxes
 */
function drawSummaryCards(
    doc: jsPDF,
    cards: SummaryCard[],
    startY: number,
    pageWidth: number
): number {
    const margin = 14
    const totalWidth = pageWidth - margin * 2
    const gap = 3.5
    const cardWidth = (totalWidth - gap * (cards.length - 1)) / cards.length
    const cardHeight = 14

    cards.forEach((card, i) => {
        const x = margin + i * (cardWidth + gap)
        // Background card
        doc.setFillColor(248, 250, 252)
        doc.setDrawColor(226, 232, 240)
        doc.roundedRect(x, startY, cardWidth, cardHeight, 1.2, 1.2, "FD")

        // Label
        doc.setFontSize(6.8)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...SLATE_MUTED)
        doc.text(card.label.toUpperCase(), x + 3.2, startY + 4.6)

        // Value
        doc.setFontSize(9.5)
        doc.setFont("helvetica", "bold")
        if (card.color) {
            doc.setTextColor(...card.color)
        } else {
            doc.setTextColor(...SLATE_DARK)
        }
        doc.text(card.value, x + 3.2, startY + 10.8)
    })

    return startY + cardHeight + 5
}

/**
 * Draw global footer and page numbers across all pages
 */
function drawPageFooters(doc: jsPDF, reportTitle: string, pageWidth: number, pageHeight: number, stationName?: string) {
    const pageCount = doc.getNumberOfPages()
    const footerStation = (stationName || "NozzleOS Fuel Station").trim()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        // Thin footer divider
        doc.setDrawColor(...BORDER_COLOR)
        doc.setLineWidth(0.2)
        doc.line(14, pageHeight - 9, pageWidth - 14, pageHeight - 9)

        // Footer text
        doc.setFontSize(7)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(...SLATE_MUTED)
        doc.text(`${footerStation}  •  NozzleOS Station Management  •  Confidential`, 14, pageHeight - 5.5)
        doc.text(reportTitle, pageWidth / 2, pageHeight - 5.5, { align: "center" })
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, pageHeight - 5.5, { align: "right" })
    }
}

/**
 * Add section title heading before tables
 */
function addSectionTitle(
    doc: jsPDF,
    title: string,
    currentY: number,
    pageHeight: number,
    margin = 14
): number {
    if (currentY > pageHeight - 35) {
        doc.addPage()
        currentY = 18
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(9.5)
    doc.setTextColor(...SLATE_DARK)
    doc.text(title, margin, currentY)
    return currentY + 3.5
}

function getFinalY(doc: jsPDF, fallback = 20): number {
    return (doc as any).lastAutoTable?.finalY ?? fallback
}

// ==========================================
// 1. PAYMENTS REPORT PDF EXPORT (TAB-SPECIFIC)
// ==========================================
export async function exportPaymentsPdfReport(params: PdfPaymentExportParams) {
    const isSummaryTab = params.activeTab === "summary"

    if (isSummaryTab) {
        // Tab 1: Payment Method Summary (Portrait)
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Method: ${
            params.paymentMethodLabel || "All"
        }  |  Attendant: ${params.attendantLabel || "All"}`

        let currentY = drawReportHeader(doc, "Payment Methods Summary Report", filterText, pageWidth, params.stationName)

        // Calculate totals
        let totalAmount = 0
        let totalCount = 0
        const methodList = params.summary?.byMethod || []

        if (methodList.length > 0) {
            methodList.forEach((m) => {
                totalAmount += Number(m.amount || 0)
                totalCount += Number(m.count || 0)
            })
        } else {
            params.transactions.forEach((tx) => {
                totalAmount += Number(tx.amount || 0)
            })
            totalCount = params.transactions.length
        }

        const avgAmount = totalCount > 0 ? totalAmount / totalCount : 0

        // Summary KPI Cards
        const summaryCards: SummaryCard[] = [
            { label: "Total Transactions", value: totalCount.toLocaleString("en-IN") },
            { label: "Total Collection", value: formatCurrency(totalAmount) },
            { label: "Average per Txn", value: formatCurrency(avgAmount) },
        ]
        currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

        currentY = addSectionTitle(doc, "Payment Method Breakdown", currentY, pageHeight)

        const methodRows = methodList.map((m) => [
            m.name,
            m.count.toLocaleString("en-IN"),
            formatCurrency(m.amount),
            `${m.percentage.toFixed(1)}%`,
        ])

        autoTable(doc, {
            startY: currentY,
            head: [["Payment Method", "Transactions", "Total Collection (Rs.)", "% Share"]],
            body: methodRows,
            foot: [
                [
                    "Total",
                    totalCount.toLocaleString("en-IN"),
                    formatCurrency(totalAmount),
                    "100.0%",
                ],
            ],
            theme: "grid",
            headStyles: COMMON_HEAD_STYLES,
            bodyStyles: COMMON_BODY_STYLES,
            alternateRowStyles: COMMON_ALT_ROW_STYLES,
            footStyles: COMMON_FOOT_STYLES,
            columnStyles: {
                0: { halign: "left", cellWidth: 65 },
                1: { halign: "center", cellWidth: 35 },
                2: { halign: "right", cellWidth: 47 },
                3: { halign: "right", cellWidth: 35 },
            },
            margin: { left: 14, right: 14, top: 16, bottom: 14 },
            showHead: "everyPage",
        })

        drawPageFooters(doc, "Payment Methods Summary Report", pageWidth, pageHeight, params.stationName)

        const filename = `Payment_Methods_Summary_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
        doc.save(filename)
    } else {
        // Tab 2: Transactions Log (Landscape)
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Method: ${
            params.paymentMethodLabel || "All"
        }  |  Attendant: ${params.attendantLabel || "All"}`

        let currentY = drawReportHeader(doc, "Payment Transactions Report", filterText, pageWidth, params.stationName)

        let totalAmount = 0
        params.transactions.forEach((tx) => {
            totalAmount += Number(tx.amount || 0)
        })
        const txCount = params.transactions.length
        const avgAmount = txCount > 0 ? totalAmount / txCount : 0

        // Summary KPI Cards
        const summaryCards: SummaryCard[] = [
            { label: "Total Transactions", value: txCount.toLocaleString("en-IN") },
            { label: "Total Collection", value: formatCurrency(totalAmount) },
            { label: "Average per Txn", value: formatCurrency(avgAmount) },
        ]
        currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

        currentY = addSectionTitle(doc, "Transaction Log", currentY, pageHeight)

        const txRows = params.transactions.map((tx, idx) => {
            const txDate = tx.createdAt ? new Date(tx.createdAt) : null
            const attendantName = tx.dutySession?.user?.name || tx.dutySession?.user?.username || "—"
            const shiftType = tx.dutySession?.type
                ? tx.dutySession.type.charAt(0).toUpperCase() + tx.dutySession.type.slice(1).toLowerCase()
                : "Shift"
            const methodName = tx.paymentMethod?.name || "—"
            const staffRef = tx.staff ? tx.staff.name || tx.staff.username : "—"
            const nozzles = (tx.dutySession?.nozzleReadings || [])
                .map((nr: any) => nr.nozzle?.code)
                .filter(Boolean)
                .join(", ") || "—"

            return [
                (idx + 1).toString(),
                formatDate(txDate),
                formatTime(txDate),
                attendantName,
                shiftType,
                methodName,
                staffRef,
                nozzles,
                formatCurrency(Number(tx.amount || 0)),
            ]
        })

        autoTable(doc, {
            startY: currentY,
            head: [
                [
                    "#",
                    "Date",
                    "Time",
                    "Attendant",
                    "Shift",
                    "Payment Method",
                    "Staff / Ref",
                    "Nozzles",
                    "Amount (Rs.)",
                ],
            ],
            body: txRows,
            foot: [
                [
                    "Total",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    `${txCount} txns`,
                    formatCurrency(totalAmount),
                ],
            ],
            theme: "grid",
            headStyles: COMMON_HEAD_STYLES,
            bodyStyles: COMMON_BODY_STYLES,
            alternateRowStyles: COMMON_ALT_ROW_STYLES,
            footStyles: COMMON_FOOT_STYLES,
            columnStyles: {
                0: { halign: "center", cellWidth: 10 },
                1: { halign: "center", cellWidth: 24 },
                2: { halign: "center", cellWidth: 18 },
                3: { halign: "left", cellWidth: 35 },
                4: { halign: "center", cellWidth: 20 },
                5: { halign: "left", cellWidth: 34 },
                6: { halign: "left", cellWidth: 34 },
                7: { halign: "left", cellWidth: 46 },
                8: { halign: "right", cellWidth: 48 },
            },
            margin: { left: 14, right: 14, top: 16, bottom: 14 },
            showHead: "everyPage",
        })

        drawPageFooters(doc, "Payment Transactions Report", pageWidth, pageHeight, params.stationName)

        const filename = `Payment_Transactions_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
        doc.save(filename)
    }
}

// ==========================================
// 2. PRODUCT SALES REPORT PDF EXPORT (TAB-SPECIFIC)
// ==========================================
export async function exportProductSalesPdfReport(params: PdfProductSalesExportParams) {
    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Category: ${
        params.categoryLabel || "All"
    }  |  Product: ${params.productLabel || "All"}  |  Attendant: ${params.attendantLabel || "All"}`

    if (params.activeTab === "by-group") {
        // Tab 2: By Category / Group (Portrait)
        const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        let currentY = drawReportHeader(doc, "Product Sales Report - By Category", filterText, pageWidth, params.stationName)

        let catTotalQty = 0
        let catTotalAmt = 0
        const catRows = (params.byGroup || []).map((g) => {
            const qty = Number(g.quantity || 0)
            const amt = Number(g.amount || 0)
            catTotalQty += qty
            catTotalAmt += amt
            return [
                g.group,
                g.productCount.toString(),
                formatNumber(qty, 2),
                formatCurrency(amt),
                `${Number(g.percentage || 0).toFixed(1)}%`,
            ]
        })

        const summaryCards: SummaryCard[] = [
            { label: "Total Revenue", value: formatCurrency(catTotalAmt) },
            { label: "Total Units Sold", value: `${formatNumber(catTotalQty, 1)} Units` },
            { label: "Categories", value: `${params.byGroup?.length || 0}` },
        ]
        currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

        currentY = addSectionTitle(doc, "Category Sales Summary", currentY, pageHeight)

        autoTable(doc, {
            startY: currentY,
            head: [["Category / Group", "Products", "Quantity Sold", "Revenue (Rs.)", "% Share"]],
            body: catRows,
            foot: [
                [
                    "Total",
                    "",
                    formatNumber(catTotalQty, 2),
                    formatCurrency(catTotalAmt),
                    "100.0%",
                ],
            ],
            theme: "grid",
            headStyles: COMMON_HEAD_STYLES,
            bodyStyles: COMMON_BODY_STYLES,
            alternateRowStyles: COMMON_ALT_ROW_STYLES,
            footStyles: COMMON_FOOT_STYLES,
            columnStyles: {
                0: { halign: "left", cellWidth: 52 },
                1: { halign: "center", cellWidth: 26 },
                2: { halign: "right", cellWidth: 32 },
                3: { halign: "right", cellWidth: 46 },
                4: { halign: "right", cellWidth: 26 },
            },
            margin: { left: 14, right: 14, top: 16, bottom: 14 },
            showHead: "everyPage",
        })

        drawPageFooters(doc, "Product Sales Report - By Category", pageWidth, pageHeight, params.stationName)

        const filename = `Product_Sales_By_Category_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
        doc.save(filename)
    } else if (params.activeTab === "transactions") {
        // Tab 3: Detailed Sales Log (Landscape)
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        let currentY = drawReportHeader(doc, "Product Sales Log Report", filterText, pageWidth, params.stationName)

        let logTotalQty = 0
        let logTotalAmt = 0

        const logRows = (params.transactions || []).map((tx, idx) => {
            const txDate = tx.soldAt ? new Date(tx.soldAt) : (tx.createdAt ? new Date(tx.createdAt) : null)
            const dateTimeStr = txDate ? format(txDate, "dd-MMM-yyyy, hh:mm a") : "—"
            const shiftType = tx.dutySession?.type
                ? tx.dutySession.type.charAt(0).toUpperCase() + tx.dutySession.type.slice(1).toLowerCase()
                : "Direct Sale"
            const attendant =
                tx.dutySession?.user?.name ||
                tx.dutySession?.user?.username ||
                tx.soldByUser?.name ||
                tx.soldByUser?.username ||
                tx.createdByUser?.name ||
                tx.createdByUser?.username ||
                "—"
            const prodName = tx.product?.name || "—"
            const qty = Number(tx.quantity || 0)
            const price = Number(tx.price || 0)
            const amt = Number(tx.amount || 0)

            logTotalQty += qty
            logTotalAmt += amt

            return [
                (idx + 1).toString(),
                dateTimeStr,
                shiftType,
                attendant,
                prodName,
                `${formatNumber(qty, 2)} ${tx.product?.unit || ""}`,
                formatCurrency(price),
                formatCurrency(amt),
            ]
        })

        const summaryCards: SummaryCard[] = [
            { label: "Total Revenue", value: formatCurrency(logTotalAmt) },
            { label: "Units Sold", value: `${formatNumber(logTotalQty, 1)} Units` },
            { label: "Total Entries", value: `${params.transactions?.length || 0}` },
        ]
        currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

        currentY = addSectionTitle(doc, "Sales Transactions Log", currentY, pageHeight)

        autoTable(doc, {
            startY: currentY,
            head: [
                [
                    "#",
                    "Date & Time",
                    "Shift Type",
                    "Attendant",
                    "Product Name",
                    "Quantity",
                    "Unit Rate (Rs.)",
                    "Total (Rs.)",
                ],
            ],
            body: logRows,
            foot: [
                [
                    "Total",
                    "",
                    "",
                    "",
                    `${params.transactions?.length || 0} entries`,
                    formatNumber(logTotalQty, 2),
                    "",
                    formatCurrency(logTotalAmt),
                ],
            ],
            theme: "grid",
            headStyles: COMMON_HEAD_STYLES,
            bodyStyles: COMMON_BODY_STYLES,
            alternateRowStyles: COMMON_ALT_ROW_STYLES,
            footStyles: COMMON_FOOT_STYLES,
            columnStyles: {
                0: { halign: "center", cellWidth: 10 },
                1: { halign: "center", cellWidth: 38 },
                2: { halign: "center", cellWidth: 22 },
                3: { halign: "left", cellWidth: 40 },
                4: { halign: "left", cellWidth: 55 },
                5: { halign: "right", cellWidth: 30 },
                6: { halign: "right", cellWidth: 34 },
                7: { halign: "right", cellWidth: 40 },
            },
            margin: { left: 14, right: 14, top: 16, bottom: 14 },
            showHead: "everyPage",
        })

        drawPageFooters(doc, "Product Sales Log Report", pageWidth, pageHeight, params.stationName)

        const filename = `Product_Sales_Log_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
        doc.save(filename)
    } else {
        // Tab 1: By Product Breakdown (Landscape) - Default
        const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
        const pageWidth = doc.internal.pageSize.getWidth()
        const pageHeight = doc.internal.pageSize.getHeight()

        let currentY = drawReportHeader(doc, "Product Sales Summary Report - By Product", filterText, pageWidth, params.stationName)

        let totalQty = 0
        let totalAmt = 0
        params.byProduct.forEach((p) => {
            totalQty += Number(p.quantity || 0)
            totalAmt += Number(p.amount || 0)
        })

        const summaryCards: SummaryCard[] = [
            {
                label: "Total Revenue",
                value: formatCurrency(params.summary?.totalSalesAmount ?? totalAmt),
            },
            {
                label: "Total Units Sold",
                value: `${formatNumber(params.summary?.totalQuantity ?? totalQty, 1)} Units`,
            },
            {
                label: "Unique Products",
                value: `${params.byProduct.length}`,
            },
            {
                label: "Sales Entries",
                value: `${params.summary?.transactionCount ?? params.transactions?.length ?? 0}`,
            },
        ]
        currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

        currentY = addSectionTitle(doc, "Product Performance Breakdown", currentY, pageHeight)

        const prodRows = params.byProduct.map((p) => [
            p.code || "—",
            p.name,
            p.group || "General",
            p.unit || "unit",
            formatNumber(p.quantity, 2),
            formatCurrency(p.averagePrice),
            formatCurrency(p.amount),
            `${Number(p.percentage || 0).toFixed(1)}%`,
        ])

        autoTable(doc, {
            startY: currentY,
            head: [
                [
                    "Code",
                    "Product Name",
                    "Category",
                    "Unit",
                    "Qty Sold",
                    "Avg Rate (Rs.)",
                    "Revenue (Rs.)",
                    "% Share",
                ],
            ],
            body: prodRows,
            foot: [
                [
                    "Total",
                    "",
                    "",
                    "",
                    formatNumber(totalQty, 2),
                    "",
                    formatCurrency(totalAmt),
                    "100.0%",
                ],
            ],
            theme: "grid",
            headStyles: COMMON_HEAD_STYLES,
            bodyStyles: COMMON_BODY_STYLES,
            alternateRowStyles: COMMON_ALT_ROW_STYLES,
            footStyles: COMMON_FOOT_STYLES,
            columnStyles: {
                0: { halign: "center", cellWidth: 18 },
                1: { halign: "left", cellWidth: 58 },
                2: { halign: "left", cellWidth: 42 },
                3: { halign: "center", cellWidth: 20 },
                4: { halign: "right", cellWidth: 28 },
                5: { halign: "right", cellWidth: 33 },
                6: { halign: "right", cellWidth: 45 },
                7: { halign: "right", cellWidth: 25 },
            },
            margin: { left: 14, right: 14, top: 16, bottom: 14 },
            showHead: "everyPage",
        })

        drawPageFooters(doc, "Product Sales Report - By Product", pageWidth, pageHeight, params.stationName)

        const filename = `Product_Sales_By_Product_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
        doc.save(filename)
    }
}

// ==========================================
// 3. SHIFT HISTORY REPORT PDF EXPORT
// ==========================================
export async function exportShiftHistoryPdfReport(params: ShiftHistoryExportParams) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Status: ${
        params.statusLabel || "All"
    }  |  Type: ${params.shiftTypeLabel || "All"}  |  Attendant: ${params.attendantLabel || "All"}`

    let currentY = drawReportHeader(doc, "Shift History Report", filterText, pageWidth, params.stationName)

    let totalFuelSales = 0
    let totalProductSales = 0
    let totalSales = 0
    let totalCollected = 0
    let totalDifference = 0

    const shiftRows = params.shifts.map((s) => {
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
                sFuelSales += dispensed * price
                if (r.nozzle?.code) {
                    nozzleCodes.push(r.nozzle.code)
                }
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
        const statusStr = s.status ? s.status.replace("_", " ").toUpperCase() : "—"

        return [
            `#${s.id}`,
            formatDate(startDate),
            s.user?.name || s.user?.username || "—",
            shiftTypeStr,
            formatTime(startDate),
            formatTime(endDate),
            durationStr,
            statusStr,
            nozzleCodes.join(", ") || "—",
            formatCurrency(sFuelSales),
            formatCurrency(sProdSales),
            formatCurrency(sTotalSales),
            formatCurrency(sCollected),
            formatCurrency(sDiff),
            sDiff, // raw difference for color hook
        ]
    })

    // Executive Summary Cards
    const summaryCards: SummaryCard[] = [
        { label: "Total Shifts", value: `${params.shifts.length.toLocaleString("en-IN")}` },
        { label: "Total Sales", value: formatCurrency(totalSales) },
        { label: "Total Collected", value: formatCurrency(totalCollected) },
        {
            label: "Net Short / Excess",
            value: `${totalDifference < -0.01 ? "-" : totalDifference > 0.01 ? "+" : ""}${formatCurrency(Math.abs(totalDifference))}`,
            color: totalDifference < -0.01 ? RED_NEGATIVE : totalDifference > 0.01 ? GREEN_POSITIVE : SLATE_DARK,
        },
    ]
    currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

    currentY = addSectionTitle(doc, "Shift Records", currentY, pageHeight)

    autoTable(doc, {
        startY: currentY,
        head: [
            [
                "ID",
                "Date",
                "Attendant",
                "Type",
                "Start",
                "End",
                "Duration",
                "Status",
                "Nozzles",
                "Fuel (Rs.)",
                "Prod (Rs.)",
                "Total (Rs.)",
                "Collected (Rs.)",
                "Diff (Rs.)",
            ],
        ],
        body: shiftRows.map((r) => r.slice(0, 14)), // omit raw diff helper
        foot: [
            [
                "Total",
                "",
                "",
                "",
                "",
                "",
                "",
                "",
                `${params.shifts.length} shifts`,
                formatCurrency(totalFuelSales),
                formatCurrency(totalProductSales),
                formatCurrency(totalSales),
                formatCurrency(totalCollected),
                formatCurrency(totalDifference),
            ],
        ],
        theme: "grid",
        headStyles: COMMON_HEAD_STYLES,
        bodyStyles: COMMON_BODY_STYLES,
        alternateRowStyles: COMMON_ALT_ROW_STYLES,
        footStyles: COMMON_FOOT_STYLES,
        columnStyles: {
            0: { halign: "center", cellWidth: 11 },
            1: { halign: "center", cellWidth: 20 },
            2: { halign: "left", cellWidth: 27 },
            3: { halign: "center", cellWidth: 16 },
            4: { halign: "center", cellWidth: 16 },
            5: { halign: "center", cellWidth: 16 },
            6: { halign: "center", cellWidth: 16 },
            7: { halign: "center", cellWidth: 18 },
            8: { halign: "left", cellWidth: 25 },
            9: { halign: "right", cellWidth: 26 },
            10: { halign: "right", cellWidth: 22 },
            11: { halign: "right", cellWidth: 26 },
            12: { halign: "right", cellWidth: 26 },
            13: { halign: "right", cellWidth: 24 },
        },
        didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 13) {
                const rawDiff = shiftRows[data.row.index]?.[14] as number
                if (typeof rawDiff === "number") {
                    if (rawDiff < -0.01) {
                        data.cell.styles.textColor = RED_NEGATIVE
                        data.cell.styles.fontStyle = "bold"
                    } else if (rawDiff > 0.01) {
                        data.cell.styles.textColor = GREEN_POSITIVE
                        data.cell.styles.fontStyle = "bold"
                    }
                }
            } else if (data.section === "foot" && data.column.index === 13) {
                if (totalDifference < -0.01) {
                    data.cell.styles.textColor = RED_NEGATIVE
                } else if (totalDifference > 0.01) {
                    data.cell.styles.textColor = GREEN_POSITIVE
                }
            }
        },
        margin: { left: 14, right: 14, top: 16, bottom: 14 },
        showHead: "everyPage",
    })

    drawPageFooters(doc, "Shift History Report", pageWidth, pageHeight, params.stationName)

    const filename = `Shift_History_Report_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
    doc.save(filename)
}

// ==========================================
// 4. STAFF PERFORMANCE REPORT PDF EXPORT
// ==========================================
export async function exportStaffPerformancePdfReport(params: StaffReportExportParams) {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    const filterText = `Period: ${params.dateRangeLabel || "All Time"}  |  Shift Type: ${
        params.shiftTypeLabel || "All"
    }  |  Staff Member: ${params.userLabel || "All"}`

    let currentY = drawReportHeader(doc, "Staff Performance Report", filterText, pageWidth, params.stationName)

    let totalShifts = 0
    let totalDutyHours = 0
    let totalFuelSales = 0
    let totalProductSales = 0
    let totalSales = 0
    let totalCollected = 0
    let totalDifference = 0

    const detailedShiftsList: any[] = []

    const staffRows = params.staff.map((st) => {
        const shiftsCount = st.shifts?.length || 0
        const dutyHrs = Number(st.totals?.totalDutyHours || 0)
        const fuelSales = Number(st.totals?.totalFuelSales || 0)
        const prodSales = Number(st.totals?.totalProductSales || 0)
        const sales = Number(st.totals?.totalSales || fuelSales + prodSales)
        const collected = Number(st.totals?.totalPaymentsCollected || 0)
        const diff = Number(st.totals?.totalDifference || collected - sales)

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

        if (st.shifts) {
            st.shifts.forEach((sh: any) => {
                detailedShiftsList.push({
                    staffName: st.userName,
                    ...sh,
                })
            })
        }

        return [
            st.userName || "—",
            shiftsCount.toString(),
            `${dutyHrs.toFixed(1)}h`,
            formatCurrency(fuelSales),
            formatCurrency(prodSales),
            formatCurrency(sales),
            formatCurrency(collected),
            formatCurrency(diff),
            statusText,
            diff, // raw difference
        ]
    })

    // Executive Summary Cards
    const summaryCards: SummaryCard[] = [
        { label: "Total Staff", value: `${params.staff.length.toLocaleString("en-IN")}` },
        { label: "Total Shifts", value: `${totalShifts.toLocaleString("en-IN")}` },
        { label: "Duty Hours", value: `${totalDutyHours.toFixed(1)} hrs` },
        { label: "Total Sales", value: formatCurrency(totalSales) },
        {
            label: "Net Variance",
            value: `${totalDifference < -0.01 ? "-" : totalDifference > 0.01 ? "+" : ""}${formatCurrency(Math.abs(totalDifference))}`,
            color: totalDifference < -0.01 ? RED_NEGATIVE : totalDifference > 0.01 ? GREEN_POSITIVE : SLATE_DARK,
        },
    ]
    currentY = drawSummaryCards(doc, summaryCards, currentY, pageWidth)

    // Section 1: Staff Performance Summary Table
    currentY = addSectionTitle(doc, "Staff Performance Summary", currentY, pageHeight)

    autoTable(doc, {
        startY: currentY,
        head: [
            [
                "Staff Name",
                "Shifts",
                "Duty Hours",
                "Fuel Sales (Rs.)",
                "Product Sales (Rs.)",
                "Total Sales (Rs.)",
                "Collected (Rs.)",
                "Difference (Rs.)",
                "Status",
            ],
        ],
        body: staffRows.map((r) => r.slice(0, 9)),
        foot: [
            [
                "Total",
                totalShifts.toString(),
                `${totalDutyHours.toFixed(1)}h`,
                formatCurrency(totalFuelSales),
                formatCurrency(totalProductSales),
                formatCurrency(totalSales),
                formatCurrency(totalCollected),
                formatCurrency(totalDifference),
                "",
            ],
        ],
        theme: "grid",
        headStyles: COMMON_HEAD_STYLES,
        bodyStyles: COMMON_BODY_STYLES,
        alternateRowStyles: COMMON_ALT_ROW_STYLES,
        footStyles: COMMON_FOOT_STYLES,
        columnStyles: {
            0: { halign: "left", cellWidth: 46 },
            1: { halign: "center", cellWidth: 18 },
            2: { halign: "right", cellWidth: 24 },
            3: { halign: "right", cellWidth: 34 },
            4: { halign: "right", cellWidth: 32 },
            5: { halign: "right", cellWidth: 36 },
            6: { halign: "right", cellWidth: 36 },
            7: { halign: "right", cellWidth: 28 },
            8: { halign: "center", cellWidth: 15 },
        },
        didParseCell: (data) => {
            if (data.section === "body" && data.column.index === 7) {
                const rawDiff = staffRows[data.row.index]?.[9] as number
                if (typeof rawDiff === "number") {
                    if (rawDiff < -0.01) {
                        data.cell.styles.textColor = RED_NEGATIVE
                        data.cell.styles.fontStyle = "bold"
                    } else if (rawDiff > 0.01) {
                        data.cell.styles.textColor = GREEN_POSITIVE
                        data.cell.styles.fontStyle = "bold"
                    }
                }
            } else if (data.section === "foot" && data.column.index === 7) {
                if (totalDifference < -0.01) {
                    data.cell.styles.textColor = RED_NEGATIVE
                } else if (totalDifference > 0.01) {
                    data.cell.styles.textColor = GREEN_POSITIVE
                }
            }
        },
        margin: { left: 14, right: 14, top: 16, bottom: 14 },
        showHead: "everyPage",
    })

    currentY = getFinalY(doc) + 7

    // Section 2: Detailed Shifts per Staff Member
    if (detailedShiftsList.length > 0) {
        currentY = addSectionTitle(doc, "Detailed Shift Records", currentY, pageHeight)

        let detFuel = 0
        let detProd = 0
        let detSales = 0
        let detCollected = 0
        let detDiff = 0

        const detRows = detailedShiftsList.map((sh) => {
            const startDate = sh.startTime ? new Date(sh.startTime) : null
            const durationHrs = Number(sh.dutyHours || 0)
            const fuel = Number(sh.fuelSales || 0)
            const prod = Number(sh.productSales || 0)
            const sales = Number(sh.totalSales || fuel + prod)
            const coll = Number(sh.totalPaymentCollected || 0)
            const diff = Number(sh.difference || coll - sales)

            detFuel += fuel
            detProd += prod
            detSales += sales
            detCollected += coll
            detDiff += diff

            const typeStr = sh.type
                ? sh.type.charAt(0).toUpperCase() + sh.type.slice(1).toLowerCase()
                : "Shift"
            const statusStr = sh.status ? sh.status.replace("_", " ").toUpperCase() : "—"

            return [
                sh.staffName || "—",
                `#${sh.id || "—"}`,
                formatDate(startDate),
                typeStr,
                `${durationHrs.toFixed(1)}h`,
                formatCurrency(fuel),
                formatCurrency(prod),
                formatCurrency(sales),
                formatCurrency(coll),
                formatCurrency(diff),
                statusStr,
                diff,
            ]
        })

        autoTable(doc, {
            startY: currentY,
            head: [
                [
                    "Staff Name",
                    "Shift ID",
                    "Date",
                    "Type",
                    "Hours",
                    "Fuel (Rs.)",
                    "Prod (Rs.)",
                    "Total (Rs.)",
                    "Collected (Rs.)",
                    "Diff (Rs.)",
                    "Status",
                ],
            ],
            body: detRows.map((r) => r.slice(0, 11)),
            foot: [
                [
                    "Total",
                    `${detailedShiftsList.length} shifts`,
                    "",
                    "",
                    "",
                    formatCurrency(detFuel),
                    formatCurrency(detProd),
                    formatCurrency(detSales),
                    formatCurrency(detCollected),
                    formatCurrency(detDiff),
                    "",
                ],
            ],
            theme: "grid",
            headStyles: COMMON_HEAD_STYLES,
            bodyStyles: COMMON_BODY_STYLES,
            alternateRowStyles: COMMON_ALT_ROW_STYLES,
            footStyles: COMMON_FOOT_STYLES,
            columnStyles: {
                0: { halign: "left", cellWidth: 38 },
                1: { halign: "center", cellWidth: 16 },
                2: { halign: "center", cellWidth: 22 },
                3: { halign: "center", cellWidth: 18 },
                4: { halign: "right", cellWidth: 16 },
                5: { halign: "right", cellWidth: 32 },
                6: { halign: "right", cellWidth: 30 },
                7: { halign: "right", cellWidth: 32 },
                8: { halign: "right", cellWidth: 32 },
                9: { halign: "right", cellWidth: 21 },
                10: { halign: "center", cellWidth: 12 },
            },
            didParseCell: (data) => {
                if (data.section === "body" && data.column.index === 9) {
                    const rawDiff = detRows[data.row.index]?.[11] as number
                    if (typeof rawDiff === "number") {
                        if (rawDiff < -0.01) {
                            data.cell.styles.textColor = RED_NEGATIVE
                            data.cell.styles.fontStyle = "bold"
                        } else if (rawDiff > 0.01) {
                            data.cell.styles.textColor = GREEN_POSITIVE
                            data.cell.styles.fontStyle = "bold"
                        }
                    }
                } else if (data.section === "foot" && data.column.index === 9) {
                    if (detDiff < -0.01) {
                        data.cell.styles.textColor = RED_NEGATIVE
                    } else if (detDiff > 0.01) {
                        data.cell.styles.textColor = GREEN_POSITIVE
                    }
                }
            },
            margin: { left: 14, right: 14, top: 16, bottom: 14 },
            showHead: "everyPage",
        })
    }

    drawPageFooters(doc, "Staff Performance Report", pageWidth, pageHeight, params.stationName)

    const filename = `Staff_Performance_Report_${format(new Date(), "yyyyMMdd_HHmm")}.pdf`
    doc.save(filename)
}
