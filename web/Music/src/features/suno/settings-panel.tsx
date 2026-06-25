"use client";

import { Cloud, RadioTower, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthPanel } from "@/features/auth/auth-panel";
import { useAiStatus } from "@/features/ai/use-ai-status";
import type { CustomModelCard } from "@/features/ai/custom-model-cards";
import type {
  TasteProfile,
  TasteProfileSettings,
} from "@/features/ai/taste-profile";
import { AiJobsPanel } from "./ai-jobs-panel";
import { CustomModelCardsPanel } from "./custom-model-cards-panel";
import { MobileInstallPanel } from "./mobile-install-panel";
import { PersonaLibraryPanel } from "./persona-library-panel";
import { ProviderCapabilityPanel } from "./provider-capability-panel";
import { PublicProfileSettingsPanel } from "./public-profile-settings-panel";
import { ReadinessPanel } from "./readiness-panel";
import { TasteProfilePanel } from "./taste-profile-panel";
import { UsageAccountingPanel } from "./usage-accounting-panel";
import { VoiceProfilePanel } from "./voice-profile-panel";

type SettingsPanelProps = {
  customModels?: {
    cards: CustomModelCard[];
    exportCards: () => string;
    remove: (id: string) => void;
  };
  taste: {
    exportProfile: () => string;
    loaded: boolean;
    profile: TasteProfile;
    resetSettings: () => void;
    settings: TasteProfileSettings;
    updateSettings: (settings: TasteProfileSettings) => void;
  };
};

export function SettingsPanel({ customModels, taste }: SettingsPanelProps) {
  const { canRefresh, loading, refresh, refreshDisabledReason, status } =
    useAiStatus();

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
      <AuthPanel />
      <Card className="border-white/10 bg-white/[0.04]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RadioTower className="size-4 text-emerald-200" />
            Creation services
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <StatusRow label="Writing assistant" value={status.text ? "ready" : "not connected"} ready={status.text} />
          <StatusRow label="Cover images" value={status.image ? "ready" : "not connected"} ready={status.image} />
          <StatusRow label="Music generation" value={status.audio ? "ready" : "not connected"} ready={status.audio} />
        </CardContent>
      </Card>
      <Card className="border-white/10 bg-white/[0.04] lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Cloud className="size-4 text-emerald-200" />
            Account and storage
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            Account access
          </div>
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            Cloud library sync
          </div>
          <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
            Local audio cache
          </div>
        </CardContent>
      </Card>
      <MobileInstallPanel />
      <TasteProfilePanel
        exportProfile={taste.exportProfile}
        loaded={taste.loaded}
        profile={taste.profile}
        resetSettings={taste.resetSettings}
        settings={taste.settings}
        updateSettings={taste.updateSettings}
      />
      <PublicProfileSettingsPanel />
      <PersonaLibraryPanel />
      <VoiceProfilePanel />
      {customModels ? (
        <CustomModelCardsPanel
          cards={customModels.cards}
          exportCards={customModels.exportCards}
          onRemove={customModels.remove}
        />
      ) : null}
      <UsageAccountingPanel />
      <ProviderCapabilityPanel
        capabilities={status.capabilities}
        loading={loading}
        score={status.capabilitySummary.score}
        refreshDisabled={!canRefresh}
        refreshDisabledReason={!canRefresh ? refreshDisabledReason : undefined}
        onRefresh={() => {
          void refresh();
        }}
      />
      <ReadinessPanel />
      <AiJobsPanel />
    </div>
  );
}

function StatusRow({
  label,
  value,
  ready,
}: {
  label: string;
  value: string;
  ready: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{value}</p>
      </div>
      <Badge
        variant="secondary"
        className={ready ? "bg-emerald-400/15 text-emerald-200" : ""}
      >
        <Shield className="mr-1 size-3" />
        {ready ? "ready" : "off"}
      </Badge>
    </div>
  );
}
