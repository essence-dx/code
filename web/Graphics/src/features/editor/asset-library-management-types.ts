export type AssetLibraryStatus = "ready" | "review" | "blocked";

export type AssetLibraryCategory =
  | "media"
  | "duplicate"
  | "metadata"
  | "font"
  | "replacement"
  | "ready";

export type AssetLibrarySourceType =
  | "data-uri"
  | "remote-url"
  | "local-path"
  | "missing";

export type AssetLibraryMediaAsset = {
  id: string;
  sourceHash: string;
  sourcePreview: string;
  sourceType: AssetLibrarySourceType;
  format?: string;
  bytes: number;
  layerIds: string[];
  pageNames: string[];
  layerNames: string[];
  libraryIds: string[];
  sourceName?: string;
  sourceUrl?: string;
  license?: string;
  altTextCount: number;
  reusable: boolean;
  needsMetadata: boolean;
  needsReplacement: boolean;
  isVideoLike: boolean;
};

export type AssetLibraryFontAsset = {
  id: string;
  fontFamily: string;
  layerIds: string[];
  pageNames: string[];
  exportSafe: boolean;
};

export type AssetLibraryManagementRow = {
  id: string;
  status: AssetLibraryStatus;
  category: AssetLibraryCategory;
  assetKind: "media" | "font" | "document";
  label: string;
  detail: string;
  pageName?: string;
  layerIds: string[];
  metric: number;
  recommendation: string;
  mediaAssetId?: string;
  fontFamily?: string;
};

export type AssetLibraryManagementReport = {
  score: number;
  status: AssetLibraryStatus;
  layerCount: number;
  mediaAssetCount: number;
  reusableMediaCount: number;
  duplicateSourceCount: number;
  missingMetadataCount: number;
  replacementQueueCount: number;
  fontFamilyCount: number;
  unsafeFontCount: number;
  blockedCount: number;
  reviewCount: number;
  readyCount: number;
  mediaAssets: AssetLibraryMediaAsset[];
  fontAssets: AssetLibraryFontAsset[];
  rows: AssetLibraryManagementRow[];
};
