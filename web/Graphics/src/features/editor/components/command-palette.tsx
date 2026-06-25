"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type CommandPaletteCommand = {
  id: string;
  label: string;
  detail: string;
  shortcut?: string;
  disabled?: boolean;
  run: () => void;
};

type CommandPaletteProps = {
  open: boolean;
  commands: CommandPaletteCommand[];
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({
  open,
  commands,
  onOpenChange,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return commands;
    }

    return commands.filter((command) =>
      `${command.label} ${command.detail}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [commands, query]);

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  function runCommand(command: CommandPaletteCommand) {
    if (command.disabled) {
      return;
    }

    command.run();
    onOpenChange(false);
  }

  function runFirstEnabledCommand() {
    const command = filteredCommands.find((item) => !item.disabled);

    if (command) {
      runCommand(command);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[560px]">
        <DialogHeader className="sr-only">
          <DialogTitle>Command palette</DialogTitle>
          <DialogDescription>Run editor commands.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 border-b border-border px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <Input
            autoFocus
            value={query}
            placeholder="Search commands"
            className="h-9 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                runFirstEnabledCommand();
              }
            }}
          />
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                disabled={command.disabled}
                className={cn(
                  "flex min-h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm",
                  command.disabled
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
                onClick={() => runCommand(command)}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {command.label}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {command.detail}
                  </span>
                </span>
                {command.shortcut ? (
                  <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {command.shortcut}
                  </kbd>
                ) : null}
              </button>
            ))
          ) : (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">
              No commands found.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
