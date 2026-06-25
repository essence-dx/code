"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  DataValidationErrorStyle,
  DataValidationListSource,
  DataValidationRuleType,
} from "@/features/workbooks/types";

const defaultValidationOption: {
  value: DataValidationRuleType;
  label: string;
  placeholder: string;
  needsValue: boolean;
} = {
  value: "list",
  label: "List",
  placeholder: "Open, In progress, Done",
  needsValue: true,
};

const validationOptions: Array<typeof defaultValidationOption> = [
  defaultValidationOption,
  {
    value: "numberGreaterThan",
    label: "Number greater than",
    placeholder: "0",
    needsValue: true,
  },
  {
    value: "numberLessThan",
    label: "Number less than",
    placeholder: "100",
    needsValue: true,
  },
  {
    value: "dateAfter",
    label: "Date after",
    placeholder: "2026-01-01",
    needsValue: true,
  },
  {
    value: "dateBefore",
    label: "Date before",
    placeholder: "2026-12-31",
    needsValue: true,
  },
  {
    value: "textContains",
    label: "Text contains",
    placeholder: "approved",
    needsValue: true,
  },
  {
    value: "customFormula",
    label: "Custom formula",
    placeholder: "=A1>0",
    needsValue: true,
  },
  {
    value: "notEmpty",
    label: "Not empty",
    placeholder: "",
    needsValue: false,
  },
];

function getOption(type: DataValidationRuleType) {
  return (
    validationOptions.find((option) => option.value === type) ??
    defaultValidationOption
  );
}

export function DataValidationDialog({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (rule: {
    type: DataValidationRuleType;
    value: string;
    listSource?: DataValidationListSource;
    dependentCell?: string;
    inputMessage?: string;
    errorMessage?: string;
    showInputMessage?: boolean;
    showErrorAlert?: boolean;
    errorStyle?: DataValidationErrorStyle;
    ignoreBlank?: boolean;
    circleInvalid?: boolean;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DataValidationRuleType>("list");
  const [listSource, setListSource] =
    useState<DataValidationListSource>("inline");
  const [dependentCell, setDependentCell] = useState("");
  const [value, setValue] = useState("");
  const [inputMessage, setInputMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [showInputMessage, setShowInputMessage] = useState(true);
  const [showErrorAlert, setShowErrorAlert] = useState(true);
  const [errorStyle, setErrorStyle] =
    useState<DataValidationErrorStyle>("stop");
  const [ignoreBlank, setIgnoreBlank] = useState(true);
  const [circleInvalid, setCircleInvalid] = useState(true);
  const option = getOption(type);
  const canCreate = !option.needsValue || value.trim().length > 0;
  const isListRule = type === "list";
  const valueLabel =
    isListRule && listSource === "range"
      ? "Source range"
      : isListRule && listSource === "dependent"
        ? "Dependent options"
        : "Value";
  const valuePlaceholder =
    isListRule && listSource === "range"
      ? "A1:A10"
      : isListRule && listSource === "dependent"
        ? "Hardware: Mouse, Keyboard; Software: License, Renewal"
        : option.placeholder;

  function handleCreate() {
    if (!canCreate) {
      return;
    }

    onCreate({
      type,
      value: option.needsValue ? value.trim() : "",
      listSource: isListRule ? listSource : undefined,
      dependentCell:
        isListRule && listSource === "dependent"
          ? dependentCell.trim() || undefined
          : undefined,
      inputMessage: inputMessage.trim() || undefined,
      errorMessage: errorMessage.trim() || undefined,
      showInputMessage,
      showErrorAlert,
      errorStyle,
      ignoreBlank,
      circleInvalid,
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DialogTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" disabled={disabled}>
              <ShieldCheck />
              <span className="sr-only">Data validation</span>
            </Button>
          </DialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Data validation</TooltipContent>
      </Tooltip>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Data validation</DialogTitle>
          <DialogDescription>Selected range rule</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="data-validation-type">Rule</Label>
            <select
              id="data-validation-type"
              value={type}
              onChange={(event) =>
                setType(event.target.value as DataValidationRuleType)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {validationOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          {isListRule ? (
            <div className="grid gap-2">
              <Label htmlFor="data-validation-list-source">Source</Label>
              <select
                id="data-validation-list-source"
                value={listSource}
                onChange={(event) =>
                  setListSource(event.target.value as DataValidationListSource)
                }
                className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="inline">Inline values</option>
                <option value="range">Cell range</option>
                <option value="dependent">Dependent list</option>
              </select>
            </div>
          ) : null}
          {isListRule && listSource === "dependent" ? (
            <div className="grid gap-2">
              <Label htmlFor="data-validation-dependent-cell">Parent cell</Label>
              <Input
                id="data-validation-dependent-cell"
                value={dependentCell}
                placeholder="A1"
                onChange={(event) => setDependentCell(event.target.value)}
              />
            </div>
          ) : null}
          {option.needsValue ? (
            <div className="grid gap-2">
              <Label htmlFor="data-validation-value">{valueLabel}</Label>
              {isListRule && listSource === "dependent" ? (
                <Textarea
                  id="data-validation-value"
                  value={value}
                  placeholder={valuePlaceholder}
                  onChange={(event) => setValue(event.target.value)}
                />
              ) : (
                <Input
                  id="data-validation-value"
                  type={
                    type === "dateAfter" || type === "dateBefore"
                      ? "date"
                      : "text"
                  }
                  value={value}
                  placeholder={valuePlaceholder}
                  onChange={(event) => setValue(event.target.value)}
                />
              )}
            </div>
          ) : null}
          <div className="grid gap-2 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ignoreBlank}
                onChange={(event) => setIgnoreBlank(event.target.checked)}
              />
              Ignore blank cells
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={circleInvalid}
                onChange={(event) => setCircleInvalid(event.target.checked)}
              />
              Circle invalid cells
            </label>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="data-validation-input-message">Input message</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showInputMessage}
                  onChange={(event) => setShowInputMessage(event.target.checked)}
                />
                Show
              </label>
            </div>
            <Input
              id="data-validation-input-message"
              value={inputMessage}
              placeholder="Shown when the cell is valid"
              onChange={(event) => setInputMessage(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="data-validation-error-message">Error alert</Label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={showErrorAlert}
                  onChange={(event) => setShowErrorAlert(event.target.checked)}
                />
                Show
              </label>
            </div>
            <select
              value={errorStyle}
              onChange={(event) =>
                setErrorStyle(event.target.value as DataValidationErrorStyle)
              }
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="stop">Stop</option>
              <option value="warning">Warning</option>
              <option value="information">Information</option>
            </select>
            <Input
              id="data-validation-error-message"
              value={errorMessage}
              placeholder="Shown when the cell is invalid"
              onChange={(event) => setErrorMessage(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleCreate} disabled={!canCreate}>
            Add rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
