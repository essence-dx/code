"use client";

import { ImagePlus } from "lucide-react";
import { type ChangeEvent, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { acceptedAssetMimeTypes } from "@/features/assets/asset-constraints";

type AssetUploadPanelProps = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  isUploadingAsset: boolean;
  assetUploadError: string | null;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function AssetUploadPanel({
  fileInputRef,
  isUploadingAsset,
  assetUploadError,
  onUpload,
}: AssetUploadPanelProps) {
  return (
    <>
      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept={acceptedAssetMimeTypes.join(",")}
        onChange={onUpload}
      />
      <Button
        variant="outline"
        className="justify-start"
        disabled={isUploadingAsset}
        onClick={() => fileInputRef.current?.click()}
      >
        <ImagePlus className="h-4 w-4" />
        {isUploadingAsset ? "Saving upload..." : "Upload media"}
      </Button>
      {assetUploadError ? (
        <p className="text-xs text-destructive">{assetUploadError}</p>
      ) : null}
    </>
  );
}
