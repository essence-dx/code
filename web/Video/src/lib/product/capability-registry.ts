import { aiCapabilities } from "@/lib/product/capabilities/ai";
import { assetCapabilities } from "@/lib/product/capabilities/assets";
import { audioRecordingCapabilities } from "@/lib/product/capabilities/audio-recording";
import { collaborationCapabilities } from "@/lib/product/capabilities/collaboration";
import { coreEditorCapabilities } from "@/lib/product/capabilities/core-editor";
import { desktopCapabilities } from "@/lib/product/capabilities/desktop";
import { exportDeliveryCapabilities } from "@/lib/product/capabilities/export-delivery";
import { platformCapabilities } from "@/lib/product/capabilities/platform";
import type { ProductCapability } from "@/lib/product/capability-types";

export const productCapabilities = [
  ...platformCapabilities,
  ...coreEditorCapabilities,
  ...aiCapabilities,
  ...assetCapabilities,
  ...audioRecordingCapabilities,
  ...exportDeliveryCapabilities,
  ...desktopCapabilities,
  ...collaborationCapabilities,
] satisfies ProductCapability[];
