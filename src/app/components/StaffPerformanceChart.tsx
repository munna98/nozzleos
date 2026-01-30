"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { trpc } from "@/lib/trpc"
import { HugeiconsIcon } from "@hugeicons/react"
import { Analytics01Icon } from "@hugeicons/core-free-icons"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, CartesianGrid } from 'recharts'
import { useState } from "react"

export function StaffPerformanceChart() {
    const [days, setDays] = useState("7")
    const { data, isLoading } = trpc.staff.getPerformanceChartData.useQuery({
        days: parseInt(days)
    })

    if (isLoading) {
        return (
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>📊 Staff Variance</CardTitle>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                    <Spinner className="size-6" />
                </CardContent>
            </Card>
        )
    }

    const chartData = data?.chartData || []

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-popover border text-popover-foreground p-3 rounded-lg shadow-md text-sm">
                    <p className="font-semibold mb-1">{data.name}</p>
                    <p className="flex justify-between gap-4">
                        <span>Status:</span>
                        <span className={data.totalDifference < 0 ? "text-red-500 font-bold" : "text-green-500 font-bold"}>
                            {data.totalDifference < 0 ? "Shortage" : "Excess"}
                        </span>
                    </p>
                    <p className="flex justify-between gap-4">
                        <span>Amount:</span>
                        <span className="font-mono">
                            {data.totalDifference < 0 ? "-" : "+"}₹{Math.abs(data.totalDifference).toLocaleString()}
                        </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
                        {data.shiftCount} shifts in period
                    </p>
                </div>
            )
        }
        return null
    }

    return (
        <Card className="col-span-1 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <HugeiconsIcon icon={Analytics01Icon} className="h-5 w-5" />
                        Staff Variance
                    </CardTitle>
                    <CardDescription>
                        Net shortage/excess by employee
                    </CardDescription>
                </div>
                <Select value={days} onValueChange={setDays}>
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Period" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="15">Last 15 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="60">Last 60 days</SelectItem>
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent>
                <div className="h-[300px] w-full min-w-0">
                    {chartData.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                            <p>No performance data available for this period</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={chartData}
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={100}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                                <ReferenceLine x={0} stroke="#666" />
                                <Bar dataKey="totalDifference" radius={[0, 4, 4, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={entry.totalDifference < 0 ? '#ef4444' : '#22c55e'} // red-500 : green-500
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}
