import type { DashboardMessage } from "@/features/dashboard/dashboard-types";

export function DashboardMessageView({ message, className = "" }: { message: DashboardMessage; className?: string }) {
  return (
    <div
      className={`rounded-md border p-3 text-sm ${
        message.tone === "destructive" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"
      } ${className}`}
    >
      {message.text}
    </div>
  );
}
