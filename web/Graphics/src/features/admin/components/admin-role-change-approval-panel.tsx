"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ShieldCheck, UsersRound, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  bulkDecideAdminRoleChangeRequests,
  decideAdminRoleChangeRequest,
} from "@/features/admin/admin-role-change-actions";
import {
  formatRole,
  type RoleChangeApprovalQueue,
  type RoleChangeApprovalRequest,
} from "@/features/admin/admin-role-change-approval";

type AdminRoleChangeApprovalPanelProps = {
  queue: RoleChangeApprovalQueue;
};

export function AdminRoleChangeApprovalPanel({
  queue,
}: AdminRoleChangeApprovalPanelProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [bulkNote, setBulkNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pendingRequests = useMemo(
    () => queue.requests.filter((request) => request.status === "pending"),
    [queue.requests],
  );
  const selectedPendingIds = selectedIds.filter((requestId) =>
    pendingRequests.some((request) => request.requestId === requestId),
  );

  function toggleSelected(requestId: string) {
    setSelectedIds((current) =>
      current.includes(requestId)
        ? current.filter((id) => id !== requestId)
        : [...current, requestId],
    );
  }

  function decideOne(
    request: RoleChangeApprovalRequest,
    decision: "approve" | "reject",
  ) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        await decideAdminRoleChangeRequest({
          requestId: request.requestId,
          decision,
          reviewerNote: notes[request.requestId] ?? "",
        });
        setSelectedIds((current) =>
          current.filter((id) => id !== request.requestId),
        );
        setMessage(`${request.targetEmail} role request ${decision}d.`);
        router.refresh();
      } catch (decisionError) {
        setError(
          decisionError instanceof Error
            ? decisionError.message
            : "Could not review role request.",
        );
      }
    });
  }

  function decideSelected(decision: "approve" | "reject") {
    if (selectedPendingIds.length === 0) {
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      try {
        const result = await bulkDecideAdminRoleChangeRequests({
          requestIds: selectedPendingIds,
          decision,
          reviewerNote: bulkNote,
        });
        setSelectedIds([]);
        setBulkNote("");
        setMessage(
          `${result.decided} role request${result.decided === 1 ? "" : "s"} ${decision}d${
            result.skipped > 0 ? `, ${result.skipped} skipped` : ""
          }.`,
        );
        router.refresh();
      } catch (decisionError) {
        setError(
          decisionError instanceof Error
            ? decisionError.message
            : "Could not review selected role requests.",
        );
      }
    });
  }

  return (
    <Card>
      <CardHeader className="gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <UsersRound className="size-4" />
            Collaborator role approvals
          </CardTitle>
          <CardDescription>
            Review elevated access requests before commenter or editor roles are
            applied to files.
          </CardDescription>
        </div>
        <Badge variant={queue.pendingCount > 0 ? "outline" : "secondary"}>
          {queue.pendingCount} pending
        </Badge>
      </CardHeader>
      <CardContent className="grid gap-4">
        {message ? (
          <Alert>
            <CheckCircle2 className="size-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <Metric label="Pending" value={queue.pendingCount} />
          <Metric label="Approved" value={queue.approvedCount} />
          <Metric label="Rejected" value={queue.rejectedCount} />
        </div>

        <div className="rounded-md border border-border bg-muted/20 p-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">Bulk decision note</div>
              <Textarea
                value={bulkNote}
                onChange={(event) => setBulkNote(event.target.value)}
                placeholder="Reviewer note for selected requests..."
                className="mt-2 min-h-20"
                disabled={isPending}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:w-72">
              <Button
                type="button"
                variant="secondary"
                disabled={isPending || selectedPendingIds.length === 0}
                onClick={() => decideSelected("approve")}
              >
                <ShieldCheck className="size-4" />
                Approve selected
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isPending || selectedPendingIds.length === 0}
                onClick={() => decideSelected("reject")}
              >
                <XCircle className="size-4" />
                Reject selected
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3">
          {queue.requests.length > 0 ? (
            queue.requests.map((request) => (
              <RoleChangeRequestCard
                key={request.requestId}
                request={request}
                selected={selectedIds.includes(request.requestId)}
                note={notes[request.requestId] ?? ""}
                disabled={isPending}
                onNoteChange={(note) =>
                  setNotes((current) => ({
                    ...current,
                    [request.requestId]: note,
                  }))
                }
                onToggleSelected={() => toggleSelected(request.requestId)}
                onApprove={() => decideOne(request, "approve")}
                onReject={() => decideOne(request, "reject")}
              />
            ))
          ) : (
            <div className="rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
              No collaborator role-change requests have been recorded yet.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function RoleChangeRequestCard({
  disabled,
  note,
  onApprove,
  onNoteChange,
  onReject,
  onToggleSelected,
  request,
  selected,
}: {
  disabled: boolean;
  note: string;
  onApprove: () => void;
  onNoteChange: (note: string) => void;
  onReject: () => void;
  onToggleSelected: () => void;
  request: RoleChangeApprovalRequest;
  selected: boolean;
}) {
  const pending = request.status === "pending";

  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium">{request.targetEmail}</div>
            <Badge variant={getStatusVariant(request.status)}>
              {request.status}
            </Badge>
            <Badge variant="outline">
              {formatRole(request.currentRole)} to{" "}
              {formatRole(request.requestedRole)}
            </Badge>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {request.fileName} / requested by {request.requesterEmail} /{" "}
            {formatDate(request.createdAt)}
          </div>
          {request.reviewerEmail ? (
            <div className="mt-1 text-xs text-muted-foreground">
              Reviewed by {request.reviewerEmail}
              {request.decidedAt ? ` / ${formatDate(request.decidedAt)}` : ""}
            </div>
          ) : null}
          {request.reviewerNote ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {request.reviewerNote}
            </p>
          ) : null}
        </div>
        <Button
          type="button"
          size="sm"
          variant={selected ? "secondary" : "outline"}
          disabled={disabled || !pending}
          onClick={onToggleSelected}
        >
          {selected ? "Selected" : "Select"}
        </Button>
      </div>

      {pending ? (
        <div className="mt-3 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <Textarea
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            placeholder="Reviewer note for this role change..."
            className="min-h-20"
            disabled={disabled}
          />
          <div className="grid grid-cols-2 gap-2 lg:w-56">
            <Button
              type="button"
              variant="secondary"
              disabled={disabled}
              onClick={onApprove}
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={onReject}
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3 text-xs">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-base text-foreground">{value}</div>
    </div>
  );
}

function getStatusVariant(status: RoleChangeApprovalRequest["status"]) {
  if (status === "approved") {
    return "secondary";
  }

  return status === "pending" ? "outline" : "destructive";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
