import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { AuthForm } from "@/features/auth/auth-form";
import { getCurrentSession } from "@/lib/session";

export default async function AuthPage() {
  const session = await getCurrentSession();

  if (session?.user) {
    redirect("/workbooks");
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 space-y-3">
          <Badge variant="secondary" className="font-mono">
            Essence Excel
          </Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-normal">
              Spreadsheet workspace
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              Sign in with your email and a confirmation code before opening your files.
            </p>
          </div>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
