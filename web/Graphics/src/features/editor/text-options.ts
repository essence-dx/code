import type {
  DesignTextResizeMode,
  TextAlign,
} from "@/features/editor/types";

export const fontFamilyOptions = [
  { value: "Inter, Arial, sans-serif", label: "Inter" },
  { value: "Arial, sans-serif", label: "Arial" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "JetBrains Mono, monospace", label: "Mono" },
] satisfies Array<{ value: string; label: string }>;

export const textAlignOptions = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
] satisfies Array<{ value: TextAlign; label: string }>;

export const textResizeModeOptions = [
  { value: "fixed", label: "Fixed" },
  { value: "auto-width", label: "Auto width" },
  { value: "auto-height", label: "Auto height" },
] satisfies Array<{ value: DesignTextResizeMode; label: string }>;
