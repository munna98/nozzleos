export default function Page() {
    return (
        <div className="container mx-auto py-10">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Welcome to NozzleOS. Manage your operations here.
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Placeholder for dashboard stats/cards */}
                <div className="rounded-xl border bg-card text-card-foreground shadow">
                    <div className="p-6 flex flex-row items-center justify-between space-y-0 pb-2">
                        <h3 className="tracking-tight text-sm font-medium">Total Employees</h3>
                    </div>
                    <div className="p-6 pt-0">
                        <div className="text-2xl font-bold">--</div>
                        <p className="text-xs text-muted-foreground">Active staff members</p>
                    </div>
                </div>
            </div>
        </div>
    );
}