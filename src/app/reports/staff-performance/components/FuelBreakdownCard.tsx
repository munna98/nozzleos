import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

interface FuelBreakdown {
    fuelName: string
    quantityInLiters: number
    amount: number
}

interface FuelBreakdownCardProps {
    fuelBreakdown: FuelBreakdown[]
}

export function FuelBreakdownCard({ fuelBreakdown }: FuelBreakdownCardProps) {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
        }).format(amount)
    }

    if (fuelBreakdown.length === 0) {
        return (
            <div className="text-sm text-muted-foreground text-center py-4">
                No fuel sales
            </div>
        )
    }

    return (
        <Card className="mt-2">
            <CardContent className="p-3">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="h-8">Fuel Type</TableHead>
                            <TableHead className="h-8 text-right">Quantity (L)</TableHead>
                            <TableHead className="h-8 text-right">Amount</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fuelBreakdown.map((fuel, idx) => (
                            <TableRow key={idx}>
                                <TableCell className="py-2">{fuel.fuelName}</TableCell>
                                <TableCell className="py-2 text-right font-mono">
                                    {fuel.quantityInLiters.toFixed(2)}
                                </TableCell>
                                <TableCell className="py-2 text-right font-medium">
                                    {formatCurrency(fuel.amount)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
