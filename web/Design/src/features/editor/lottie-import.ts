import { maxMediaAssetBytes } from "@/features/assets/asset-constraints";

export const maxLottieJsonBytes = maxMediaAssetBytes;

export type LottieImportResult =
  | {
      ok: true;
      normalizedJson: string;
      width: number | null;
      height: number | null;
    }
  | { ok: false; message: string };

export function isLottieJsonFile(file: File, mimeType: string) {
  return (
    mimeType === "application/json" || file.name.toLowerCase().endsWith(".json")
  );
}

export function parseLottieAnimationText(text: string): LottieImportResult {
  try {
    const parsed = JSON.parse(text) as {
      w?: unknown;
      h?: unknown;
      layers?: unknown;
    };

    if (!Array.isArray(parsed.layers)) {
      return {
        ok: false,
        message: "This JSON does not look like a Lottie animation.",
      };
    }

    return {
      ok: true,
      normalizedJson: JSON.stringify(parsed),
      width: readPositiveDimension(parsed.w),
      height: readPositiveDimension(parsed.h),
    };
  } catch {
    return {
      ok: false,
      message: "Could not parse this Lottie JSON file.",
    };
  }
}

export function getLottieLayerSize(args: {
  width: number | null;
  height: number | null;
}) {
  const width = Math.min(420, args.width ?? 360);
  const height =
    args.width && args.height
      ? Math.round((width / args.width) * args.height)
      : 360;

  return { width, height };
}

function readPositiveDimension(value: unknown) {
  return typeof value === "number" && value > 0 ? value : null;
}
