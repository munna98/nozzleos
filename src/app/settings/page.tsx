"use client"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

export default function SettingsPage() {
    const settingsQuery = trpc.settings.get.useQuery()
    const utils = trpc.useUtils()

    const updateMutation = trpc.settings.update.useMutation({
        onSuccess: () => {
            utils.settings.get.invalidate()
            toast.success("Settings updated")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update settings")
        }
    })

    const settings = settingsQuery.data
    const loading = settingsQuery.isLoading

    const handleToggle = (field: 'enableDenominationEntry' | 'enableCoinEntry', value: boolean) => {
        updateMutation.mutate({ [field]: value })
    }

    if (loading) {
        return (
            <div className="container mx-auto py-10 flex justify-center">
                <Spinner className="size-8" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 space-y-8 px-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
                <p className="text-muted-foreground">Manage global application settings</p>
            </div>

            <div className="grid gap-6 max-w-2xl">
                <Card>
                    <CardHeader>
                        <CardTitle>Cash Payment Settings</CardTitle>
                        <CardDescription>
                            Configure how cash payments are collected during shifts
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="denomination-entry">Denomination Entry</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show denomination breakdown (₹2000, ₹500, etc.) when adding cash payments
                                </p>
                            </div>
                            <Switch
                                id="denomination-entry"
                                checked={settings?.enableDenominationEntry ?? true}
                                onCheckedChange={(checked) => handleToggle('enableDenominationEntry', checked)}
                                disabled={updateMutation.isPending}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label htmlFor="coin-entry">Coins Entry</Label>
                                <p className="text-sm text-muted-foreground">
                                    Show a separate field for coins total when denomination entry is enabled
                                </p>
                            </div>
                            <Switch
                                id="coin-entry"
                                checked={settings?.enableCoinEntry ?? true}
                                onCheckedChange={(checked) => handleToggle('enableCoinEntry', checked)}
                                disabled={updateMutation.isPending || !settings?.enableDenominationEntry}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
