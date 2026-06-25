import { CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function StatusBadge({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return (
    <Badge variant={active ? "secondary" : "destructive"} className="gap-1">
      {active ? <CheckCircle2 className="size-3" /> : <XCircle className="size-3" />}
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}
