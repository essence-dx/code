import { existsSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DesktopReadinessCard } from "@/features/settings/components/desktop-readiness-card";
import { LocalMaintenanceCenterCard } from "@/features/settings/components/local-maintenance-center-card";
import { OperationalReadinessCard } from "@/features/settings/components/operational-readiness-card";
import { ProductionTelemetryCard } from "@/features/settings/components/production-telemetry-card";
import { ProductReadinessCard } from "@/features/settings/components/product-readiness-card";
import { ReleaseOperationsHistoryCard } from "@/features/settings/components/release-operations-history-card";
import { ReleaseReadinessCard } from "@/features/settings/components/release-readiness-card";
import { WorkspaceActivityCard } from "@/features/settings/components/workspace-activity-card";
import { loadSettingsServerData } from "@/app/settings/settings-server-data";
import type { PublicAiGenerationRecord } from "@/lib/ai/generation-records";
import type { AiUsageAction } from "@/lib/ai/schemas";

export default async function SettingsPage() {
  const textEditingConfigured = Boolean(
    process.env.GROQ_API_KEY || process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL,
  );
  const imageGenerationConfigured = Boolean(
    process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN || process.env.VERCEL,
  );
  const aiConfigured = textEditingConfigured || imageGenerationConfigured;
  const databaseConfigured = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
  const vercelLinked = existsSync(join(process.cwd(), ".vercel", "project.json"));
  const deploymentUrlCaptured = Boolean(process.env.ESSENCE_RELEASE_DEPLOYMENT_URL);
  const deploymentScreenshotCaptured = Boolean(process.env.ESSENCE_RELEASE_DEPLOYMENT_URL && process.env.ESSENCE_RELEASE_SCREENSHOT_URL);
  const desktopLaunchVerified = process.env.ESSENCE_DESKTOP_LAUNCH_VERIFIED === "1";
  const { isSignedIn, usageReview, generationReview } = await loadSettingsServerData({
    databaseConfigured,
    staticExport: isTauriStaticExport(),
  });

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Essence Studio</p>
            <h1 className="text-2xl font-semibold">Settings</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/editor">Editor</Link>
          </Button>
        </div>
        <ProductReadinessCard />
        <ReleaseReadinessCard
          textAiConfigured={textEditingConfigured}
          imageGenerationConfigured={imageGenerationConfigured}
          databaseConfigured={databaseConfigured}
          vercelLinked={vercelLinked}
          deploymentUrlCaptured={deploymentUrlCaptured}
          deploymentScreenshotCaptured={deploymentScreenshotCaptured}
          desktopLaunchVerified={desktopLaunchVerified}
        />
        <OperationalReadinessCard
          aiConfigured={aiConfigured}
          isSignedIn={isSignedIn}
          dailyAiRemaining={usageReview?.dailyRemaining ?? null}
        />
        <LocalMaintenanceCenterCard />
        <ReleaseOperationsHistoryCard />
        <ProductionTelemetryCard
          aiConfigured={aiConfigured}
          isSignedIn={isSignedIn}
          usage={
            usageReview
              ? {
                  dailyRemaining: usageReview.dailyRemaining,
                  summary: usageReview.summary,
                  events: usageReview.events,
                }
              : null
          }
          generations={generationReview}
        />
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Creative AI
              <Badge variant={aiConfigured ? "default" : "secondary"}>{aiConfigured ? "Configured" : "Needs setup"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTitle>Workspace status</AlertTitle>
              <AlertDescription>
                {textEditingConfigured ? "Text editing actions are ready." : "Text editing actions need setup."}{" "}
                {imageGenerationConfigured ? "Image generation is ready." : "Image generation needs setup before it can create assets."}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
        <DesktopReadinessCard />
        <WorkspaceActivityCard
          aiSummary={
            usageReview
              ? {
                  dailyUsed: usageReview.dailyUsed,
                  dailyLimit: usageReview.limits.daily,
                  dailyRemaining: usageReview.dailyRemaining,
                  recentEvents: usageReview.summary.total,
                  recentGenerations: generationReview.length,
                }
              : null
          }
        />
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Usage review
              <Badge variant="secondary">{usageReview ? `${usageReview.dailyRemaining} left today` : "Private"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {usageReview ? (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <UsageMetric label="Past hour" value={`${usageReview.hourlyUsed}/${usageReview.limits.hourly}`} />
                  <UsageMetric label="Past day" value={`${usageReview.dailyUsed}/${usageReview.limits.daily}`} />
                  <UsageMetric label="Recent success" value={`${usageReview.summary.complete}/${usageReview.summary.total || 0}`} />
                </div>
                <div className="space-y-2">
                  {usageReview.events.length ? (
                    usageReview.events.map((event) => (
                      <div key={`${event.action}-${event.createdAt}`} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium">{actionLabel(event.action)}</div>
                          <div className="text-xs text-muted-foreground">{formatUsageDate(event.createdAt)}</div>
                        </div>
                        <Badge variant={event.status === "complete" ? "default" : event.status === "rate_limited" ? "secondary" : "destructive"}>
                          {event.result}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No AI activity yet.</div>
                  )}
                </div>
              </>
            ) : (
              <Alert>
                <AlertTitle>Usage is private</AlertTitle>
                <AlertDescription>Sign in to review recent AI activity, remaining limits, and safe retry status.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-lg">
              Generation history
              <Badge variant="secondary">{generationReview.length ? `${generationReview.length} recent` : "Private"}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {generationReview.length ? (
              generationReview.map((record) => <GenerationRecordRow key={`${record.action}-${record.createdAt}-${record.outputAssetKind}`} record={record} />)
            ) : (
              <Alert>
                <AlertTitle>No saved generations</AlertTitle>
                <AlertDescription>Recent prompts, model usage, safety status, and generated asset metadata will appear here after sign-in.</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function UsageMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

function actionLabel(action: AiUsageAction) {
  const labels: Record<AiUsageAction, string> = {
    script: "Script",
    captions: "Captions",
    "b-roll": "B-roll",
    "video-project": "Video project",
    repurpose: "Repurpose",
    "edit-plan": "Edit plan",
    "transcript-cleanup": "Transcript cleanup",
    "smart-cut": "Smart cut",
    "subtitle-style": "Subtitle style",
    "subtitle-translation": "Subtitle translation",
    image: "Image asset",
    "image-edit": "Image edit",
    voiceover: "Voiceover",
    "audio-cleanup": "Audio cleanup",
    "video-enhancement": "Video enhancement",
    "scene-video": "Scene video",
  };

  return labels[action];
}

function GenerationRecordRow({ record }: { record: PublicAiGenerationRecord }) {
  return (
    <div className="rounded-md border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium">{actionLabel(record.action)}</div>
          <div className="text-xs text-muted-foreground">
            {record.outputAssetKind === "none" ? "No saved asset" : `${record.outputAssetKind} output`} / {formatUsageDate(record.createdAt)}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Badge variant={record.safetyStatus === "blocked" ? "destructive" : record.safetyStatus === "flagged" ? "secondary" : "outline"}>
            {record.safetyStatus}
          </Badge>
          <Badge variant={record.status === "complete" ? "default" : record.status === "rate_limited" ? "secondary" : "destructive"}>{record.status}</Badge>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{record.promptPreview}</p>
      {record.outputSummary ? <p className="mt-2 text-xs">{record.outputSummary}</p> : null}
      {record.outputAssetName ? (
        <div className="mt-2 text-xs text-muted-foreground">
          {record.outputAssetKind}: {record.outputAssetName}
        </div>
      ) : null}
      {record.safetyReason ? <p className="mt-2 text-xs text-muted-foreground">{record.safetyReason}</p> : null}
    </div>
  );
}

function formatUsageDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function isTauriStaticExport() {
  return process.env.TAURI_STATIC_EXPORT === "1";
}
