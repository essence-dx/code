"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  GitCompareArrows,
  GitMerge,
  History,
  RotateCcw,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  branchDesignFileVersion,
  createNamedVersion,
  restoreDesignFileVersion,
  type DesignFileVersionSummary,
} from "@/features/files/actions";
import { VersionCompareDialog } from "@/features/editor/components/version-compare-dialog";
import { VersionMergeDialog } from "@/features/editor/components/version-merge-dialog";
import { VersionTimelineReviewPanel } from "@/features/editor/components/version-timeline-review-panel";
import type {
  DesignBranchMergeIntent,
  DesignDocument,
} from "@/features/editor/types";

type VersionHistoryMenuProps = {
  fileId: string;
  document: DesignDocument;
  currentUser: {
    name: string;
    email: string;
  };
  versions: DesignFileVersionSummary[];
  onMergeVersion: (
    document: DesignDocument,
    version: DesignFileVersionSummary,
  ) => void;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function VersionHistoryMenu({
  fileId,
  document,
  currentUser,
  versions,
  onMergeVersion,
  onRecordActivity,
}: VersionHistoryMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [versionName, setVersionName] = useState("");
  const [compareVersion, setCompareVersion] =
    useState<DesignFileVersionSummary | null>(null);
  const [mergeVersion, setMergeVersion] =
    useState<DesignFileVersionSummary | null>(null);
  const [branchVersionTarget, setBranchVersionTarget] =
    useState<DesignFileVersionSummary | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchMergeIntent, setBranchMergeIntent] =
    useState<DesignBranchMergeIntent>("exploration");

  function openSaveDialog() {
    setVersionName(getDefaultVersionName());
    setOpen(false);
    setSaveDialogOpen(true);
  }

  function saveVersion() {
    const name = versionName.trim();

    if (!name) {
      return;
    }

    startTransition(async () => {
      await createNamedVersion({
        fileId,
        name,
        document,
      });
      setSaveDialogOpen(false);
      router.refresh();
    });
  }

  function restoreVersion(versionId: string) {
    startTransition(async () => {
      const result = await restoreDesignFileVersion({ versionId });
      setOpen(false);
      router.push(`/?file=${result.fileId}`);
      router.refresh();
    });
  }

  function openBranchDialog(version: DesignFileVersionSummary) {
    setBranchVersionTarget(version);
    setBranchName(`Branch - ${version.name}`);
    setBranchMergeIntent("exploration");
    setOpen(false);
  }

  function branchVersion() {
    const version = branchVersionTarget;
    const name = branchName.trim();

    if (!version || !name) {
      return;
    }

    startTransition(async () => {
      const result = await branchDesignFileVersion({
        versionId: version.id,
        branchName: name,
        mergeIntent: branchMergeIntent,
      });
      setBranchVersionTarget(null);
      router.push(`/?file=${result.fileId}`);
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="secondary">
            <History className="size-4" />
            Versions
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[76vh] w-96 overflow-y-auto">
          <DropdownMenuItem disabled={isPending} onClick={openSaveDialog}>
            <Save className="size-4" />
            Save named version
          </DropdownMenuItem>
          <div className="p-1">
            <VersionTimelineReviewPanel
              currentDocument={document}
              onRecordActivity={onRecordActivity}
              versions={versions}
            />
          </div>
          <DropdownMenuSeparator />
          {versions.length > 0 ? (
            versions.map((version) => (
              <Fragment key={version.id}>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => {
                    setCompareVersion(version);
                    setOpen(false);
                  }}
                >
                  <GitCompareArrows className="size-4" />
                  <VersionLabel version={version} action="Compare" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => openBranchDialog(version)}
                >
                  <GitBranch className="size-4" />
                  <VersionLabel version={version} action="Branch from" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => {
                    setMergeVersion(version);
                    setOpen(false);
                  }}
                >
                  <GitMerge className="size-4" />
                  <VersionLabel version={version} action="Merge from" />
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={isPending}
                  onClick={() => restoreVersion(version.id)}
                >
                  <RotateCcw className="size-4" />
                  <VersionLabel version={version} action="Restore" />
                </DropdownMenuItem>
              </Fragment>
            ))
          ) : (
            <div className="px-2 py-3 text-sm text-muted-foreground">
              No named versions yet.
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Save named version</DialogTitle>
            <DialogDescription>
              Keep a restorable checkpoint of the current file.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              saveVersion();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="version-name">Version name</Label>
              <Input
                id="version-name"
                value={versionName}
                maxLength={120}
                onChange={(event) => setVersionName(event.target.value)}
                placeholder="Homepage experiment before review"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setSaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || versionName.trim().length === 0}
              >
                Save version
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(branchVersionTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setBranchVersionTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Create design branch</DialogTitle>
            <DialogDescription>
              Fork a named version into a private file with merge intent and a
              restore point.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              branchVersion();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch name</Label>
              <Input
                id="branch-name"
                value={branchName}
                maxLength={120}
                onChange={(event) => setBranchName(event.target.value)}
                placeholder="Mobile checkout review"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch-merge-intent">Merge intent</Label>
              <Select
                value={branchMergeIntent}
                onValueChange={(value) =>
                  setBranchMergeIntent(value as DesignBranchMergeIntent)
                }
              >
                <SelectTrigger id="branch-merge-intent" className="w-full">
                  <SelectValue placeholder="Choose merge intent" />
                </SelectTrigger>
                <SelectContent>
                  {branchMergeIntentOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {option.description}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setBranchVersionTarget(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending || branchName.trim().length === 0}
              >
                Create branch
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <VersionCompareDialog
        currentDocument={document}
        version={compareVersion}
        open={Boolean(compareVersion)}
        onRecordActivity={onRecordActivity}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCompareVersion(null);
          }
        }}
      />
      <VersionMergeDialog
        currentDocument={document}
        currentUser={currentUser}
        version={mergeVersion}
        open={Boolean(mergeVersion)}
        onMerge={(document) => {
          if (mergeVersion) {
            onMergeVersion(document, mergeVersion);
          }
        }}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setMergeVersion(null);
          }
        }}
      />
    </>
  );
}

function getDefaultVersionName() {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

const branchMergeIntentOptions = [
  {
    value: "exploration",
    label: "Exploration",
    description: "Try a direction without review pressure.",
  },
  {
    value: "review",
    label: "Review",
    description: "Prepare changes for reviewer comparison.",
  },
  {
    value: "hotfix",
    label: "Hotfix",
    description: "Patch a focused production design issue.",
  },
  {
    value: "release-candidate",
    label: "Release candidate",
    description: "Stabilize changes for review and release.",
  },
] satisfies ReadonlyArray<{
  value: DesignBranchMergeIntent;
  label: string;
  description: string;
}>;

function VersionLabel({
  version,
  action,
}: {
  version: DesignFileVersionSummary;
  action: string;
}) {
  return (
    <span className="min-w-0 flex-1">
      <span className="block truncate">
        {action} {version.name}
      </span>
      <span className="block truncate text-xs text-muted-foreground">
        {formatDate(version.createdAt)}
      </span>
    </span>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}
