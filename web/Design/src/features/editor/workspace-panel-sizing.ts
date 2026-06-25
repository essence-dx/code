export type WorkspacePanelId = "assets" | "properties";

export type WorkspacePanelWidths = Record<WorkspacePanelId, number>;

export const defaultWorkspacePanelWidths: WorkspacePanelWidths = {
  assets: 272,
  properties: 320,
};

export const workspacePanelWidthLimits: Record<
  WorkspacePanelId,
  { max: number; min: number }
> = {
  assets: {
    max: 420,
    min: 216,
  },
  properties: {
    max: 520,
    min: 280,
  },
};

export function clampWorkspacePanelWidth(
  panelId: WorkspacePanelId,
  width: number,
) {
  const limits = workspacePanelWidthLimits[panelId];

  return Math.min(limits.max, Math.max(limits.min, Math.round(width)));
}
