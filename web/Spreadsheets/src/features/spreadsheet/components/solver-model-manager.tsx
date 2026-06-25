"use client";

import { FolderOpen, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SolverModelDraft } from "@/features/spreadsheet/components/solver-panel-types";

export function SolverModelManager({
  disabled,
  models,
  onDeleteModel,
  onLoadModel,
  onSaveModel,
}: {
  disabled?: boolean;
  models: SolverModelDraft[];
  onDeleteModel: (modelId: string) => void;
  onLoadModel: (modelId: string) => void;
  onSaveModel: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  const selectedModel = models.find((model) => model.id === selectedModelId);

  useEffect(() => {
    if (!models.some((model) => model.id === selectedModelId)) {
      setSelectedModelId(models[0]?.id ?? "");
    }
  }, [models, selectedModelId]);

  function saveModel() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return;
    }

    onSaveModel(trimmedName);
    setName("");
  }

  return (
    <div className="grid gap-2 border-b pb-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium">Models</h3>
        <span className="text-xs text-muted-foreground">{models.length}/12</span>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Input
          value={name}
          disabled={disabled}
          placeholder="Model name"
          className="h-8 px-2 text-xs"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              saveModel();
            }
          }}
        />
        <Button
          type="button"
          size="sm"
          disabled={disabled || !name.trim()}
          onClick={saveModel}
        >
          <Save className="size-3" />
          Save
        </Button>
      </div>
      {models.length > 0 ? (
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-2">
          <select
            value={selectedModelId}
            disabled={disabled}
            className="h-8 rounded-md border bg-background px-2 text-xs"
            onChange={(event) => setSelectedModelId(event.target.value)}
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="icon"
            variant="outline"
            title="Load model"
            disabled={disabled || !selectedModel}
            onClick={() => {
              if (selectedModel) {
                onLoadModel(selectedModel.id);
              }
            }}
          >
            <FolderOpen className="size-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            title="Delete model"
            disabled={disabled || !selectedModel}
            onClick={() => {
              if (selectedModel) {
                onDeleteModel(selectedModel.id);
              }
            }}
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No saved models.</p>
      )}
    </div>
  );
}
