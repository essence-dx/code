import Link from "next/link";
import { AuthPanel } from "@/features/auth/components/auth-panel";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/editor">Back to editor</Link>
        </Button>
        <AuthPanel />
      </div>
    </main>
  );
}
