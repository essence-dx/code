"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  KnowledgeTextField,
  PanelSectionHeader,
  RemoveButton,
} from "@/features/editor/components/project-knowledge-pack-controls";
import type {
  ProjectKnowledgeAudienceProfile,
  ProjectKnowledgeConstraint,
  ProjectKnowledgeConstraintKind,
  ProjectKnowledgeDecisionLog,
  ProjectKnowledgeReference,
  ProjectKnowledgeReferenceKind,
} from "@/features/editor/types";

const constraintKinds: Array<{
  value: ProjectKnowledgeConstraintKind;
  label: string;
}> = [
  { value: "brand", label: "Brand" },
  { value: "legal", label: "Legal" },
  { value: "format", label: "Format" },
  { value: "timeline", label: "Timeline" },
  { value: "accessibility", label: "Accessibility" },
  { value: "custom", label: "Custom" },
];

const referenceKinds: Array<{
  value: ProjectKnowledgeReferenceKind;
  label: string;
}> = [
  { value: "source", label: "Source" },
  { value: "research", label: "Research" },
  { value: "asset", label: "Asset" },
  { value: "competitor", label: "Competitor" },
  { value: "inspiration", label: "Inspiration" },
  { value: "custom", label: "Custom" },
];

export function EditableAudienceProfiles({
  profiles,
  onAdd,
  onUpdate,
  onRemove,
}: {
  profiles: ProjectKnowledgeAudienceProfile[];
  onAdd: () => void;
  onUpdate: (
    id: string,
    updates: Partial<ProjectKnowledgeAudienceProfile>,
  ) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <PanelSectionHeader title="Audience profiles" onAdd={onAdd} />
      {profiles.map((profile) => (
        <div key={profile.id} className="space-y-2 rounded-md border p-2">
          <div className="flex min-w-0 items-center gap-2">
            <Input
              className="h-8 min-w-0"
              value={profile.name}
              aria-label="Audience name"
              onChange={(event) =>
                onUpdate(profile.id, { name: event.target.value })
              }
            />
            <RemoveButton onClick={() => onRemove(profile.id)} />
          </div>
          <KnowledgeTextField
            label="Segment"
            value={profile.segment}
            onChange={(value) => onUpdate(profile.id, { segment: value })}
          />
          <KnowledgeTextField
            label="Need"
            value={profile.need}
            as="textarea"
            onChange={(value) => onUpdate(profile.id, { need: value })}
          />
          <KnowledgeTextField
            label="Objection"
            value={profile.objection}
            as="textarea"
            onChange={(value) => onUpdate(profile.id, { objection: value })}
          />
          <KnowledgeTextField
            label="Desired action"
            value={profile.desiredAction}
            onChange={(value) => onUpdate(profile.id, { desiredAction: value })}
          />
        </div>
      ))}
    </div>
  );
}

export function EditableConstraints({
  constraints,
  onAdd,
  onUpdate,
  onRemove,
}: {
  constraints: ProjectKnowledgeConstraint[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ProjectKnowledgeConstraint>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <PanelSectionHeader title="Constraints" onAdd={onAdd} />
      {constraints.map((constraint) => (
        <div key={constraint.id} className="space-y-2 rounded-md border p-2">
          <div className="flex min-w-0 items-center gap-2">
            <Input
              className="h-8 min-w-0"
              value={constraint.label}
              aria-label="Constraint label"
              onChange={(event) =>
                onUpdate(constraint.id, { label: event.target.value })
              }
            />
            <RemoveButton onClick={() => onRemove(constraint.id)} />
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Select
              value={constraint.kind}
              onValueChange={(value) =>
                onUpdate(constraint.id, {
                  kind: value as ProjectKnowledgeConstraintKind,
                })
              }
            >
              <SelectTrigger
                className="h-8 min-w-0 flex-1"
                aria-label="Constraint kind"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {constraintKinds.map((kind) => (
                  <SelectItem key={kind.value} value={kind.value}>
                    {kind.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
              <Switch
                size="sm"
                checked={constraint.required}
                onCheckedChange={(checked) =>
                  onUpdate(constraint.id, { required: checked })
                }
              />
              Required
            </label>
          </div>
          <KnowledgeTextField
            label="Detail"
            value={constraint.detail}
            as="textarea"
            onChange={(value) => onUpdate(constraint.id, { detail: value })}
          />
        </div>
      ))}
    </div>
  );
}

export function EditableReferences({
  references,
  onAdd,
  onUpdate,
  onRemove,
}: {
  references: ProjectKnowledgeReference[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ProjectKnowledgeReference>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <PanelSectionHeader title="References" onAdd={onAdd} />
      {references.map((reference) => (
        <div key={reference.id} className="space-y-2 rounded-md border p-2">
          <div className="flex min-w-0 items-center gap-2">
            <Input
              className="h-8 min-w-0"
              value={reference.label}
              aria-label="Reference label"
              onChange={(event) =>
                onUpdate(reference.id, { label: event.target.value })
              }
            />
            <RemoveButton onClick={() => onRemove(reference.id)} />
          </div>
          <Select
            value={reference.kind}
            onValueChange={(value) =>
              onUpdate(reference.id, {
                kind: value as ProjectKnowledgeReferenceKind,
              })
            }
          >
            <SelectTrigger className="h-8 w-full" aria-label="Reference kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {referenceKinds.map((kind) => (
                <SelectItem key={kind.value} value={kind.value}>
                  {kind.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <KnowledgeTextField
            label="URL"
            value={reference.url}
            onChange={(value) => onUpdate(reference.id, { url: value })}
          />
          <KnowledgeTextField
            label="Note"
            value={reference.note}
            as="textarea"
            onChange={(value) => onUpdate(reference.id, { note: value })}
          />
        </div>
      ))}
    </div>
  );
}

export function EditableDecisionLogs({
  logs,
  onAdd,
  onUpdate,
  onRemove,
}: {
  logs: ProjectKnowledgeDecisionLog[];
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<ProjectKnowledgeDecisionLog>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      <PanelSectionHeader title="Decision log" onAdd={onAdd} />
      {logs.map((log) => (
        <div key={log.id} className="space-y-2 rounded-md border p-2">
          <div className="flex min-w-0 items-center gap-2">
            <Input
              className="h-8 min-w-0"
              value={log.title}
              aria-label="Decision title"
              onChange={(event) =>
                onUpdate(log.id, { title: event.target.value })
              }
            />
            <RemoveButton onClick={() => onRemove(log.id)} />
          </div>
          <KnowledgeTextField
            label="Decision"
            value={log.decision}
            as="textarea"
            onChange={(value) => onUpdate(log.id, { decision: value })}
          />
          <KnowledgeTextField
            label="Rationale"
            value={log.rationale}
            as="textarea"
            onChange={(value) => onUpdate(log.id, { rationale: value })}
          />
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
            <KnowledgeTextField
              label="Owner"
              value={log.owner}
              onChange={(value) => onUpdate(log.id, { owner: value })}
            />
            <KnowledgeTextField
              label="Date"
              type="date"
              value={log.decidedAt}
              onChange={(value) => onUpdate(log.id, { decidedAt: value })}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
