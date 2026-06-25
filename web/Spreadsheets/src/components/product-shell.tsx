import Link from "next/link";
import { Table2 } from "lucide-react";
import { SignOutButton } from "@/features/auth/sign-out-button";

export function ProductShell({
  children,
  userName,
}: {
  children: React.ReactNode;
  userName: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b bg-card px-4">
        <Link href="/workbooks" className="flex items-center gap-2 font-semibold">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <Table2 className="size-4" />
          </span>
          Essence Excel
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">{userName}</span>
          <SignOutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
