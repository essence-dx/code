"use client";

import { PackageCheck, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import type { DesignTemplateSummary } from "@/features/editor/types";
import {
  CreatorCard,
  GrowthMetric,
  GrowthTemplateCard,
  InstallHistoryPanel,
  ModerationQueueCard,
  OfflinePackCard,
} from "@/features/templates/template-marketplace-growth-cards";
import {
  addMarketplaceInstallRecord,
  createTemplateMarketplaceGrowth,
  emptyMarketplaceGrowthState,
  normalizeMarketplaceGrowthState,
  toggleMarketplaceGrowthListValue,
  type MarketplaceGrowthState,
} from "@/features/templates/template-marketplace-growth";

type TemplateMarketplaceGrowthPanelProps = {
  templates: DesignTemplateSummary[];
  createFromTemplateAction: (formData: FormData) => void;
};

const marketplaceGrowthStorageKey = "essence-studio-marketplace-growth-v1";

export function TemplateMarketplaceGrowthPanel({
  templates,
  createFromTemplateAction,
}: TemplateMarketplaceGrowthPanelProps) {
  const [state, setState] = useState<MarketplaceGrowthState>(
    emptyMarketplaceGrowthState,
  );
  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  useEffect(() => {
    try {
      const storedState = window.localStorage.getItem(
        marketplaceGrowthStorageKey,
      );

      setState(
        storedState
          ? normalizeMarketplaceGrowthState(JSON.parse(storedState))
          : emptyMarketplaceGrowthState,
      );
    } catch {
      setState(emptyMarketplaceGrowthState);
    } finally {
      setHasLoadedStorage(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStorage) return;

    window.localStorage.setItem(
      marketplaceGrowthStorageKey,
      JSON.stringify(state),
    );
  }, [hasLoadedStorage, state]);

  const growth = useMemo(
    () => createTemplateMarketplaceGrowth(templates, state),
    [state, templates],
  );

  if (!growth.templates.length) {
    return null;
  }

  const updateGrowthState = (
    updater: (currentState: MarketplaceGrowthState) => MarketplaceGrowthState,
  ) => {
    setState((currentState) =>
      normalizeMarketplaceGrowthState(updater(currentState)),
    );
  };

  const toggleFavorite = (templateId: string) => {
    updateGrowthState((currentState) => ({
      ...currentState,
      favoriteTemplateIds: toggleMarketplaceGrowthListValue(
        currentState.favoriteTemplateIds,
        templateId,
      ),
    }));
  };

  const toggleCreator = (creatorKey: string) => {
    updateGrowthState((currentState) => ({
      ...currentState,
      savedCreatorKeys: toggleMarketplaceGrowthListValue(
        currentState.savedCreatorKeys,
        creatorKey,
      ),
    }));
  };

  const toggleOfflinePack = (packId: string) => {
    updateGrowthState((currentState) => ({
      ...currentState,
      offlinePackIds: toggleMarketplaceGrowthListValue(
        currentState.offlinePackIds,
        packId,
      ),
    }));
  };

  const recordTemplateInstall = (templateId: string) => {
    updateGrowthState((currentState) =>
      addMarketplaceInstallRecord(currentState, templateId),
    );
  };

  return (
    <section className="space-y-3 rounded-md border border-border bg-card/60 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <PackageCheck className="h-4 w-4 text-primary" />
            Marketplace growth center
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Favorites, saved creators, install history, offline packs, and
            quality moderation for published templates.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 lg:min-w-[28rem]">
          <GrowthMetric label="Favorites" value={growth.totals.favorites} />
          <GrowthMetric
            label="Saved creators"
            value={growth.totals.savedCreators}
          />
          <GrowthMetric label="Installs" value={growth.totals.installs} />
          <GrowthMetric
            label="Avg rating"
            value={growth.totals.averageRating.toFixed(1)}
          />
        </div>
      </div>

      <Tabs defaultValue="growth" className="space-y-3">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="growth">Growth</TabsTrigger>
          <TabsTrigger value="creators">Creators</TabsTrigger>
          <TabsTrigger value="packs">Offline packs</TabsTrigger>
          <TabsTrigger value="moderation">Moderation</TabsTrigger>
        </TabsList>

        <TabsContent value="growth" className="space-y-3">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.7fr)_minmax(300px,0.9fr)]">
            <div className="grid gap-3 md:grid-cols-2">
              {growth.featuredTemplates.map((template) => (
                <GrowthTemplateCard
                  key={template.id}
                  template={template}
                  createFromTemplateAction={createFromTemplateAction}
                  onFavorite={() => toggleFavorite(template.id)}
                  onSaveCreator={() => toggleCreator(template.creatorKey)}
                  onInstall={() => recordTemplateInstall(template.id)}
                />
              ))}
            </div>

            <InstallHistoryPanel
              installHistory={growth.installHistory}
              favoriteTemplates={growth.favoriteTemplates}
            />
          </div>
        </TabsContent>

        <TabsContent value="creators" className="grid gap-3 md:grid-cols-2">
          {growth.creators.slice(0, 8).map((creator) => (
            <CreatorCard
              key={creator.key}
              creator={creator}
              onToggle={() => toggleCreator(creator.key)}
            />
          ))}
        </TabsContent>

        <TabsContent value="packs" className="grid gap-3 md:grid-cols-2">
          {growth.offlinePacks.map((pack) => (
            <OfflinePackCard
              key={pack.id}
              pack={pack}
              onToggle={() => toggleOfflinePack(pack.id)}
            />
          ))}
        </TabsContent>

        <TabsContent value="moderation" className="space-y-3">
          {growth.moderationQueue.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {growth.moderationQueue.map((item) => (
                <ModerationQueueCard key={item.template.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border p-3 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              Published templates are clear of current moderation signals.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}
