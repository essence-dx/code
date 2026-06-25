"use client";

import { LocateFixed, Move3D } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FollowBehavior, SceneObject, Vec3 } from "../../types";

const axes = ["X", "Y", "Z"] as const;
const defaultFollowOffset: Vec3 = [0, 0, 0];

interface FollowBehaviorPanelProps {
  object: SceneObject;
  objects: SceneObject[];
  updateObject: (id: string, updater: (object: SceneObject) => SceneObject) => void;
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function updateVec3(vector: Vec3, index: number, value: number): Vec3 {
  const nextVector: Vec3 = [...vector];

  nextVector[index] = value;

  return nextVector;
}

export function FollowBehaviorPanel({ object, objects, updateObject }: FollowBehaviorPanelProps) {
  const follow = object.follow;
  const targetObjects = objects.filter((entry) => entry.id !== object.id && entry.kind !== "group");

  function setFollow(nextFollow: FollowBehavior | undefined) {
    updateObject(object.id, (entry) => ({
      ...entry,
      follow: nextFollow,
    }));
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Follow</div>
      <Label className="flex items-center gap-2 text-sm">
        <Checkbox
          checked={follow?.enabled === true}
          onCheckedChange={(checked) =>
            setFollow(
              checked === true
                ? {
                    enabled: true,
                    targetKind: follow?.targetKind ?? "camera",
                    targetObjectId: follow?.targetObjectId,
                    offset: follow?.offset ?? defaultFollowOffset,
                    smoothing: follow?.smoothing ?? 1,
                  }
                : undefined,
            )
          }
        />
        Follow a runtime target
      </Label>

      {follow?.enabled === true ? (
        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              className="justify-start gap-2"
              size="sm"
              variant={(follow.targetKind ?? "camera") === "camera" ? "default" : "outline"}
              onClick={() =>
                setFollow({
                  ...follow,
                  enabled: true,
                  targetKind: "camera",
                  targetObjectId: undefined,
                })
              }
            >
              <Move3D className="size-3.5 shrink-0" />
              Viewer camera
            </Button>
            {targetObjects.map((targetObject) => (
              <Button
                key={targetObject.id}
                className="min-w-0 justify-start gap-2"
                size="sm"
                variant={follow.targetKind === "object" && follow.targetObjectId === targetObject.id ? "default" : "outline"}
                onClick={() =>
                  setFollow({
                    ...follow,
                    enabled: true,
                    targetKind: "object",
                    targetObjectId: targetObject.id,
                  })
                }
              >
                <LocateFixed className="size-3.5 shrink-0" />
                <span className="truncate">{targetObject.name}</span>
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {axes.map((axis, index) => (
              <div key={`follow-offset-${axis}`} className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Offset {axis}</Label>
                <Input
                  inputMode="decimal"
                  step={0.1}
                  type="number"
                  value={Number((follow.offset ?? defaultFollowOffset)[index].toFixed(2))}
                  onChange={(event) =>
                    setFollow({
                      ...follow,
                      enabled: true,
                      offset: updateVec3(follow.offset ?? defaultFollowOffset, index, toNumber(event.target.value, (follow.offset ?? defaultFollowOffset)[index])),
                    })
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`follow-${object.id}-smoothing`}>Smoothing</Label>
            <Input
              id={`follow-${object.id}-smoothing`}
              max={1}
              min={0}
              step={0.05}
              type="number"
              value={follow.smoothing ?? 1}
              onChange={(event) =>
                setFollow({
                  ...follow,
                  enabled: true,
                  smoothing: clamp(toNumber(event.target.value, follow.smoothing ?? 1), 0, 1),
                })
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
