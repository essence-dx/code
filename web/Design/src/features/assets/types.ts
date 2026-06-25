export type UserAssetSummary = {
  id: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  sourceProvider: string | null;
  sourceUrl: string | null;
  authorName: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  createdAt: string;
  updatedAt: string;
};
