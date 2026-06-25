"use client";

import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface ProjectComplianceExportProps {
  projectId: string;
}

function getFileName(contentDisposition: string | null) {
  const match = contentDisposition?.match(/filename="([^"]+)"/i);

  return match?.[1] ?? "essence-spline-compliance-report.json";
}

export function ProjectComplianceExport({ projectId }: ProjectComplianceExportProps) {
  const [pending, setPending] = useState(false);

  async function downloadReport() {
    setPending(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/compliance?download=1`, {
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = typeof payload?.error === "string" ? payload.error : "Compliance export failed";

        throw new Error(message);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectUrl;
      link.download = getFileName(response.headers.get("Content-Disposition"));
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Compliance report exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Compliance export failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button className="w-full justify-start gap-2" disabled={pending} size="sm" variant="ghost" onClick={() => void downloadReport()}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
      Compliance export
    </Button>
  );
}
