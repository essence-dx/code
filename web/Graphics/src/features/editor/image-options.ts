import type { ImageFit } from "@/features/editor/types";

export const imageFitOptions = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "fill", label: "Fill" },
] satisfies Array<{ value: ImageFit; label: string }>;
