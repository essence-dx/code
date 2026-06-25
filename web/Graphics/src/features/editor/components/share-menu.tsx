"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Check,
  Link2,
  Link2Off,
  Play,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileAccessDialog } from "@/features/editor/components/file-access-dialog";
import { ShareLinkReviewPanel } from "@/features/editor/components/share-link-review-panel";
import {
  createShareLink,
  listDesignFileShares,
  revokeShareLink,
  revokeShareLinks,
  updateShareLinkExpiry,
  type DesignFileShareSummary,
} from "@/features/files/actions";
import {
  sharePresetConfig,
  sharePermissionPresets,
  type FileAccessRole,
  type SharePermissionPreset,
} from "@/features/files/permissions";

type ShareMenuProps = {
  fileId: string;
  accessRole: FileAccessRole;
  onRecordActivity?: (label: string, detail?: string) => void;
};

export function ShareMenu({
  fileId,
  accessRole,
  onRecordActivity,
}: ShareMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [copiedKind, setCopiedKind] = useState<SharePermissionPreset | null>(
    null,
  );
  const [revoked, setRevoked] = useState(false);
  const [open, setOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [shares, setShares] = useState<DesignFileShareSummary[]>([]);
  const canManage = accessRole === "owner";

  const refreshShares = useCallback(() => {
    if (!canManage) {
      setShares([]);
      return;
    }

    startTransition(async () => {
      setShares(await listDesignFileShares({ fileId }));
    });
  }, [canManage, fileId]);

  useEffect(() => {
    if (open) {
      refreshShares();
    }
  }, [open, refreshShares]);

  function copyShareLink(preset: SharePermissionPreset) {
    if (!canManage) {
      return;
    }

    startTransition(async () => {
      const result = await createShareLink({ fileId, preset });
      const url = `${window.location.origin}${getSharePath(
        result.token,
        preset,
      )}`;

      await navigator.clipboard.writeText(url);
      setShares(await listDesignFileShares({ fileId }));
      setCopiedKind(preset);
      setRevoked(false);
      onRecordActivity?.("Copied share link", sharePresetConfig[preset].label);
      window.setTimeout(() => setCopiedKind(null), 1600);
    });
  }

  function revokeLinks() {
    if (!canManage) {
      return;
    }

    startTransition(async () => {
      await revokeShareLinks({ fileId });
      setShares(await listDesignFileShares({ fileId }));
      setRevoked(true);
      setCopiedKind(null);
      onRecordActivity?.("Disabled share links", fileId);
      window.setTimeout(() => setRevoked(false), 1800);
    });
  }

  function disableShare(shareId: string) {
    if (!canManage) {
      return;
    }

    startTransition(async () => {
      await revokeShareLink({ shareId });
      setShares(await listDesignFileShares({ fileId }));
      onRecordActivity?.("Disabled share link", shareId);
    });
  }

  function setShareExpiry(shareId: string, expiresInDays: number | null) {
    if (!canManage) {
      return;
    }

    startTransition(async () => {
      await updateShareLinkExpiry({ shareId, expiresInDays });
      setShares(await listDesignFileShares({ fileId }));
      onRecordActivity?.(
        expiresInDays ? "Set share link expiry" : "Cleared share link expiry",
        expiresInDays ? `${expiresInDays} days` : shareId,
      );
    });
  }

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="secondary">
            <Link2 className="size-4" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-[76vh] w-96 overflow-y-auto">
          {sharePermissionPresets.map((preset) => {
            const config = sharePresetConfig[preset];
            const copied = copiedKind === preset;

            return (
              <DropdownMenuItem
                key={preset}
                disabled={isPending || !canManage}
                onClick={() => copyShareLink(preset)}
              >
                {copied ? (
                  <Check className="size-4" />
                ) : preset === "prototype" ? (
                  <Play className="size-4" />
                ) : preset === "review" ? (
                  <Users className="size-4" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                <span className="min-w-0">
                  <span className="block text-sm">
                    {copied ? `Copied ${config.label}` : `Copy ${config.label}`}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {config.description}
                  </span>
                </span>
              </DropdownMenuItem>
            );
          })}
          <div className="p-1">
            <ShareLinkReviewPanel
              isPending={isPending}
              onDisableShare={disableShare}
              onRecordActivity={onRecordActivity}
              onSetShareExpiry={setShareExpiry}
              shares={shares}
            />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={isPending || !canManage}
            onSelect={(event) => {
              event.preventDefault();
              setAccessDialogOpen(true);
            }}
          >
            <UserPlus className="size-4" />
            Manage people access
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isPending || !canManage} onClick={revokeLinks}>
            {revoked ? <Check className="size-4" /> : <Link2Off className="size-4" />}
            {revoked ? "Links disabled" : "Disable existing links"}
          </DropdownMenuItem>
          {!canManage ? (
            <DropdownMenuItem disabled>
              <ShieldCheck className="size-4" />
              Owner access required
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <FileAccessDialog
        fileId={fileId}
        onRecordActivity={onRecordActivity}
        open={accessDialogOpen}
        onOpenChange={setAccessDialogOpen}
      />
    </>
  );
}

function getSharePath(token: string, preset: SharePermissionPreset) {
  return preset === "prototype" ? `/share/${token}/prototype` : `/share/${token}`;
}
