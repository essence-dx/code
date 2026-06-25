"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { variableScopeOptions } from "@/features/editor/variable-bindings";
import type {
  DesignVariableCollection,
  DesignVariableScope,
} from "@/features/editor/types";

type VariableCollectionsEditorProps = {
  collections: DesignVariableCollection[];
  onAddCollection: () => void;
  onUpdateCollection: (
    collectionId: string,
    patch: Partial<DesignVariableCollection>,
  ) => void;
};

export function VariableCollectionsEditor({
  collections,
  onAddCollection,
  onUpdateCollection,
}: VariableCollectionsEditorProps) {
  return (
    <div className="space-y-2 rounded-md border border-border bg-background/40 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium text-muted-foreground">
          Collections
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-7 gap-1 px-2 text-xs"
          onClick={onAddCollection}
        >
          <Plus className="size-3" />
          Collection
        </Button>
      </div>
      <div className="space-y-1">
        {collections.map((collection) => (
          <div
            key={collection.id}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)] gap-2"
          >
            <Input
              value={collection.name}
              className="h-8"
              onChange={(event) =>
                onUpdateCollection(collection.id, {
                  name: event.target.value,
                })
              }
            />
            <Select
              value={collection.scope}
              onValueChange={(scope) =>
                onUpdateCollection(collection.id, {
                  scope: scope as DesignVariableScope,
                })
              }
            >
              <SelectTrigger className="h-8 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {variableScopeOptions.map((scope) => (
                  <SelectItem key={scope.value} value={scope.value}>
                    {scope.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
