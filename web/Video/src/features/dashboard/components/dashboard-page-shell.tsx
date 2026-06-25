"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Film, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardPageShellProps = {
  children: ReactNode;
};

export function DashboardPageShell({ children }: DashboardPageShellProps) {
  return (
    <main className="min-h-screen bg-background" aria-label="Project dashboard">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8" aria-labelledby="dashboard-projects-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Essence Studio</p>
            <h1 id="dashboard-projects-title" className="text-3xl font-semibold tracking-tight">
              Projects
            </h1>
          </div>
          <div className="flex gap-2" aria-label="Dashboard actions">
            <Button asChild variant="outline">
              <Link href="/settings">
                <Settings className="size-4" />
                Settings
              </Link>
            </Button>
            <Button asChild>
              <Link href="/editor">
                <Film className="size-4" />
                Open editor
              </Link>
            </Button>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
