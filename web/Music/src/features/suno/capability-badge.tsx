import { Badge } from "@/components/ui/badge";

export function CapabilityBadge({
  label,
  ready,
}: {
  label: string;
  ready: boolean;
}) {
  return (
    <Badge
      variant="secondary"
      className={ready ? "bg-emerald-400/15 text-emerald-200" : ""}
    >
      {label}: {ready ? "ready" : "off"}
    </Badge>
  );
}
