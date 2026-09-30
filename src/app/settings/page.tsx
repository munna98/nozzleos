"use client"

import { useState, useEffect } from "react"

import { trpc } from "@/lib/trpc"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import { useColorTheme, ColorTheme } from "@/components/color-theme-provider"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

export default function SettingsPage() {
    const { colorTheme, setColorTheme } = useColorTheme()
    const settingsQuery = trpc.settings.get.useQuery()
    const utils = trpc.useUtils()

    const [localSettings, setLocalSettings] = useState<{
        enableDenominationEntry: boolean
        enableCoinEntry: boolean
    } | null>(null)

    const settings = settingsQuery.data
    const loading = settingsQuery.isLoading

    // Sync local state with server data when loaded
    useEffect(() => {
        if (settings) {
            setLocalSettings({
                enableDenominationEntry: settings.enableDenominationEntry ?? true,
                enableCoinEntry: settings.enableCoinEntry ?? true
            })
        }
    }, [settings])

    const updateMutation = trpc.settings.update.useMutation({
        onSuccess: () => {
            utils.settings.get.invalidate()
            toast.success("Settings updated")
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update settings")
        }
    })

    const handleToggle = (field: 'enableDenominationEntry' | 'enableCoinEntry', value: boolean) => {
        setLocalSettings(prev => prev ? ({ ...prev, [field]: value }) : null)
    }

    const handleSave = () => {
        if (!localSettings) return
        updateMutation.mutate(localSettings)
    }

    const hasChanges = localSettings && settings && (
        localSettings.enableDenominationEntry !== (settings.enableDenominationEntry ?? true) ||
        localSettings.enableCoinEntry !== (settings.enableCoinEntry ?? true)
    )

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
                        <CardTitle>Appearance</CardTitle>
                        <CardDescription>
                            Choose your preferred color theme for the application
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {[
                                { id: 'default', name: 'Default', primary: 'bg-black', bg: 'bg-white' },
                                { id: 'clean', name: 'Clean Slate', primary: 'bg-[#5f33e1]', bg: 'bg-white' },
                                { id: 'pastel', name: 'Pastel Dreams', primary: 'bg-[#ea98f6]', bg: 'bg-[#fff5fe]' },
                                { id: 'sunday', name: 'Sunday Afternoon', primary: 'bg-[#d97f4a]', bg: 'bg-[#fef9f5]' },
                            ].map((theme) => (
                                <button
                                    key={theme.id}
                                    onClick={() => setColorTheme(theme.id as ColorTheme)}
                                    className={cn(
                                        "group relative flex flex-col gap-2 p-2 rounded-xl border-2 transition-all hover:border-primary/50",
                                        colorTheme === theme.id ? "border-primary bg-primary/5" : "border-muted"
                                    )}
                                >
                                    <div className={cn("h-16 w-full rounded-lg border shadow-sm overflow-hidden", theme.bg)}>
                                        <div className="flex flex-col h-full">
                                            <div className="h-3 w-full bg-muted/20" />
                                            <div className="flex-1 p-2">
                                                <div className={cn("h-full w-1/2 rounded-md shadow-sm", theme.primary)} />
                                            </div>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-center truncate">{theme.name}</span>
                                    {colorTheme === theme.id && (
                                        <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full p-0.5 shadow-sm">
                                            <Check className="size-3" />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

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
                                checked={localSettings?.enableDenominationEntry ?? true}
                                onCheckedChange={(checked) => handleToggle('enableDenominationEntry', checked)}
                                disabled={loading}
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
                                checked={localSettings?.enableCoinEntry ?? true}
                                onCheckedChange={(checked) => handleToggle('enableCoinEntry', checked)}
                                disabled={loading || !localSettings?.enableDenominationEntry}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="border-t px-6 py-4 bg-muted/20 flex justify-end">
                        <Button
                            onClick={handleSave}
                            disabled={!hasChanges || updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save Changes"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    )
}
