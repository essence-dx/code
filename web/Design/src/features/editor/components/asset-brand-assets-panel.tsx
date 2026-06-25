"use client";

import { ImagePlus } from "lucide-react";
import { type ChangeEvent, type RefObject } from "react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { acceptedImageMimeTypes } from "@/features/assets/asset-constraints";
import { BrandGuardrailsPanel } from "@/features/editor/components/brand-guardrails-panel";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignDocument,
} from "@/features/editor/types";

type AssetBrandAssetsPanelProps = {
  document: DesignDocument;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
  logoInputRef: RefObject<HTMLInputElement | null>;
  isUploadingLogo: boolean;
  logoUploadError: string | null;
  onApplyBrandKit: () => void;
  onLogoUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onAddBrandLogo: (logo: BrandLogoSummary) => void;
};

export function AssetBrandAssetsPanel({
  document,
  brandColors,
  brandFonts,
  brandLogos,
  logoInputRef,
  isUploadingLogo,
  logoUploadError,
  onApplyBrandKit,
  onLogoUpload,
  onAddBrandLogo,
}: AssetBrandAssetsPanelProps) {
  return (
    <>
      <section className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Brand guardrails
          </h3>
          <span className="text-xs text-muted-foreground">Kit</span>
        </div>
        <BrandGuardrailsPanel
          document={document}
          brandColors={brandColors}
          brandFonts={brandFonts}
          brandLogos={brandLogos}
          onApplyBrandKit={onApplyBrandKit}
        />
      </section>
      <Separator />
      <section className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">
            Brand logos
          </h3>
          <span className="text-xs text-muted-foreground">
            {brandLogos.length}
          </span>
        </div>
        <input
          ref={logoInputRef}
          className="hidden"
          type="file"
          accept={acceptedImageMimeTypes.join(",")}
          onChange={onLogoUpload}
        />
        <Button
          variant="outline"
          className="mb-3 w-full justify-start"
          disabled={isUploadingLogo}
          onClick={() => logoInputRef.current?.click()}
        >
          <ImagePlus className="h-4 w-4" />
          {isUploadingLogo ? "Saving logo..." : "Upload logo"}
        </Button>
        {logoUploadError ? (
          <p className="mb-3 text-xs text-destructive">{logoUploadError}</p>
        ) : null}
        {brandLogos.length ? (
          <div className="grid grid-cols-3 gap-2">
            {brandLogos.map((logo) => (
              <button
                key={logo.id}
                type="button"
                className="group aspect-square overflow-hidden rounded-md border border-border bg-background p-2 text-left transition hover:border-foreground"
                onClick={() => onAddBrandLogo(logo)}
                title={logo.name}
              >
                <img
                  src={logo.dataUrl}
                  alt={logo.name}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Save brand marks here once, then reuse them in every design.
          </p>
        )}
      </section>
    </>
  );
}
