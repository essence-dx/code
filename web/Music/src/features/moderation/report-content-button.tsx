"use client";

import { Flag, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  getOnlineActionTitle,
  useOnlineActionGuard,
} from "@/features/system/online-action-guard";
import { reportReasonLabels } from "@/lib/moderation";

type ReportContentButtonProps = {
  targetId: string;
  targetLabel: string;
  targetType: "song" | "profile" | "playlist" | "comment" | "hook";
};

const reportReasons = Object.entries(reportReasonLabels);

export function ReportContentButton({
  targetId,
  targetLabel,
  targetType,
}: ReportContentButtonProps) {
  const onlineGuard = useOnlineActionGuard();
  const connectionDisabled = !onlineGuard.canUseConnectionActions;
  const reportActionTitle = (title: string) =>
    getOnlineActionTitle(onlineGuard, "public-interaction", title);
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [submitting, setSubmitting] = useState(false);

  async function submitReport() {
    if (connectionDisabled) {
      toast.error(onlineGuard.publicInteractionDisabledReason);
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          details,
          reason,
          reporterEmail: email,
          targetId,
          targetType,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(payload?.error || "Could not submit report.");
      }

      toast.success("Report submitted for review.");
      setDetails("");
      setEmail("");
      setOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not submit report.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          disabled={connectionDisabled}
          title={reportActionTitle("Report content")}
        >
          <Flag className="size-4" />
          Report
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report {targetType}</DialogTitle>
          <DialogDescription>
            Send this to the moderation queue for review.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3 text-sm">
            {targetLabel}
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reportReasons.map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`report-details-${targetType}-${targetId}`}>
              Details
            </Label>
            <Textarea
              id={`report-details-${targetType}-${targetId}`}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              placeholder="What should the reviewer know?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`report-email-${targetType}-${targetId}`}>
              Email
            </Label>
            <Input
              id={`report-email-${targetType}-${targetId}`}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => setOpen(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={submitting || connectionDisabled}
            title={reportActionTitle("Submit report")}
            onClick={() => {
              void submitReport();
            }}
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Submit report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
