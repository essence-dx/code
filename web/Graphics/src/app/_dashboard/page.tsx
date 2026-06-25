import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminDashboard } from "@/features/admin/components/admin-dashboard";
import { getAdminDashboardData } from "@/features/admin/admin-data";

export default async function DashboardPage() {
  const dashboard = await getAdminDashboardData();

  if (!dashboard.authorized && !dashboard.currentUser) {
    return <AuthPanel />;
  }

  if (!dashboard.authorized) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4 text-foreground">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{dashboard.reason}</p>
            <Button asChild>
              <Link href="/">Back to editor</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return <AdminDashboard data={dashboard} />;
}
