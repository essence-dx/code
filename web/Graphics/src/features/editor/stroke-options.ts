import type { StrokeLineCap, StrokeLineJoin } from "@/features/editor/types";

export const strokeLineCapOptions = [
  { value: "butt", label: "Butt" },
  { value: "round", label: "Round" },
  { value: "square", label: "Square" },
] satisfies Array<{ value: StrokeLineCap; label: string }>;

export const strokeLineJoinOptions = [
  { value: "miter", label: "Miter" },
  { value: "round", label: "Round" },
  { value: "bevel", label: "Bevel" },
] satisfies Array<{ value: StrokeLineJoin; label: string }>;
