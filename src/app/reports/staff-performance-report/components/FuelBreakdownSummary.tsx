import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface FuelBreakdownSummaryProps {
    fuelBreakdown: Array<{
        fuelName: string
        quantityInLiters: number
        amount: number
    }>
}

export function FuelBreakdownSummary({ fuelBreakdown }: FuelBreakdownSummaryProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount)
    }

    const formatQuantity = (qty: number) => {
        return new Intl.NumberFormat('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(qty)
    }

    if (fuelBreakdown.length === 0) {
        return null
    }

    return (
        <Card className="col-span-full">
            <CardContent className="px-4 py-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {fuelBreakdown.map((fuel) => (
                        <div
                            key={fuel.fuelName}
                            className="flex flex-col gap-2 p-4 rounded-lg border bg-muted/30"
                        >
                            <Badge variant="outline" className="font-semibold w-fit">
                                {fuel.fuelName}
                            </Badge>
                            <div className="flex items-end justify-between gap-3">
                                <div className="flex flex-col">
                                    <span className="text-xs text-muted-foreground">Quantity</span>
                                    <span className="text-lg font-bold">
                                        {formatQuantity(fuel.quantityInLiters)} L
                                    </span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xs text-muted-foreground">Amount</span>
                                    <span className="text-sm">
                                        {formatCurrency(fuel.amount)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    )
}
