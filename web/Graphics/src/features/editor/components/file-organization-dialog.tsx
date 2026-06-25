"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import {
  updateDesignFileLocation,
  type DesignFileScope,
  type DesignFileSummary,
} from "@/features/files/actions";

const scopeOptions = [
  { id: "private", label: "Private" },
  { id: "team", label: "Team" },
  { id: "public", label: "Public" },
] as const satisfies ReadonlyArray<{
  id: DesignFileScope;
  label: string;
}>;

export function FileOrganizationDialog({
  file,
  onOpenChange,
  onSaved,
  open,
}: {
  file: DesignFileSummary | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  open: boolean;
}) {
  const [scope, setScope] = useState<DesignFileScope>("private");
  const [teamName, setTeamName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isPending, startTransition] = useTransition();
  const canSave = Boolean(
    file && teamName.trim().length > 0 && projectName.trim().length > 0,
  );

  useEffect(() => {
    if (!file || !open) {
      return;
    }

    setScope(normalizeScope(file.scope));
    setTeamName(file.teamName);
    setProjectName(file.projectName);
  }, [file, open]);

  function saveLocation() {
    if (!file || !canSave) {
      return;
    }

    startTransition(async () => {
      await updateDesignFileLocation({
        fileId: file.id,
        projectName: projectName.trim(),
        scope,
        teamName: teamName.trim(),
      });
      onOpenChange(false);
      onSaved();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Organize file</DialogTitle>
          <DialogDescription>
            Set the workspace scope, team, and project for this design file.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="file-scope">Scope</Label>
            <Select
              value={scope}
              onValueChange={(value) => setScope(value as DesignFileScope)}
            >
              <SelectTrigger id="file-scope" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="file-team">Team</Label>
            <Input
              id="file-team"
              value={teamName}
              maxLength={80}
              onChange={(event) => setTeamName(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="file-project">Project</Label>
            <Input
              id="file-project"
              value={projectName}
              maxLength={80}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter showCloseButton>
          <Button disabled={!canSave || isPending} onClick={saveLocation}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function normalizeScope(scope: string): DesignFileScope {
  if (scope === "team" || scope === "public") {
    return scope;
  }

  return "private";
}
