"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Braces, Code2, Copy, Download, FileCode2, Globe2, Loader2, Share2, ShieldAlert, Smartphone, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getPlatformEmbedPresetCode, PLATFORM_EMBED_PRESETS, type PlatformEmbedPresetId } from "../platform-embed-presets";
import { publishProject, unpublishProject, updateProject } from "../project-api";
import { getProjectReviewGate, type ProjectReviewGate } from "../project-review-gates";
import { applyScenePermissionPolicyTemplate, scenePermissionPolicyTemplates, type ScenePermissionPolicyTemplateId } from "../scene-permission-policy-templates";
import { resolveShareSettings, type SharePermission, type ShareSettings } from "../share-settings";
import {
  APP_PACKAGE_PRESETS,
  type AppPackagePresetId,
} from "../app-package-export";
import {
  getAbsoluteUrl,
  getAndroidComposeEmbedCode,
  getAppPackagePath,
  getEmbedCode,
  getEmbedPath,
  getKotlinSceneFetchCode,
  getPublicSceneApiPath,
  getReactEmbedCode,
  getSceneFetchCode,
  getSelfHostedPackagePath,
  getSharePath,
  getSwiftSceneFetchCode,
  getSwiftUIEmbedCode,
  getViewerPackagePath,
} from "../share-links";

interface ProjectShareActionsProps {
  projectId: string;
  publishedAt: string | null;
  shareSettings: ShareSettings | null;
  shareId: string | null;
}

function getShareUrl(shareId: string) {
  return getAbsoluteUrl(window.location.origin, getSharePath(shareId));
}

function getEmbedUrl(shareId: string) {
  return getAbsoluteUrl(window.location.origin, getEmbedPath(shareId));
}

function getPublicSceneApiUrl(shareId: string) {
  return getAbsoluteUrl(window.location.origin, getPublicSceneApiPath(shareId));
}

function getViewerPackageUrl(shareId: string) {
  return getAbsoluteUrl(window.location.origin, getViewerPackagePath(shareId));
}

function getSelfHostedPackageUrl(shareId: string) {
  return getAbsoluteUrl(window.location.origin, getSelfHostedPackagePath(shareId));
}

function getAppPackageUrl(shareId: string, presetId: AppPackagePresetId) {
  return getAbsoluteUrl(window.location.origin, getAppPackagePath(shareId, presetId));
}

export function ProjectShareActions({ projectId, publishedAt, shareId, shareSettings }: ProjectShareActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<
    | "copy-android"
    | "copy-api"
    | "copy-embed"
    | "copy-fetch"
    | "copy-kotlin-fetch"
    | "copy-link"
    | "copy-platform"
    | "copy-react"
    | "copy-swift-fetch"
    | "copy-swiftui"
    | "embed-settings"
    | "permission"
    | "policy-template"
    | "publish"
    | "unpublish"
    | null
  >(null);
  const published = Boolean(publishedAt && shareId);
  const resolvedShareSettings = resolveShareSettings(shareSettings);
  const publicLinkGate = getProjectReviewGate(resolvedShareSettings, "publicLink");
  const embedGate = getProjectReviewGate(resolvedShareSettings, "embed");
  const appPackageGate = getProjectReviewGate(resolvedShareSettings, "appPackage");
  const canCopyEmbed = embedGate.allowed && resolvedShareSettings.allowEmbed && resolvedShareSettings.allowCodeExport;
  const canCopyPublicApi = embedGate.allowed && resolvedShareSettings.allowPublicApi;
  const canCopyFetchHelper = embedGate.allowed && resolvedShareSettings.allowPublicApi && resolvedShareSettings.allowCodeExport;
  const canDownloadViewer = appPackageGate.allowed && resolvedShareSettings.allowViewerDownload;

  function showGateError(gate: ProjectReviewGate) {
    toast.error("Review approval required", {
      description: gate.message,
    });
  }

  function requireReviewGate(gate: ProjectReviewGate) {
    if (gate.allowed) {
      return true;
    }

    showGateError(gate);
    return false;
  }

  async function copyToClipboard(value: string, successMessage: string) {
    if (!navigator.clipboard) {
      throw new Error("Clipboard is unavailable");
    }

    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  }

  async function copyShareLink(nextShareId: string) {
    if (!requireReviewGate(publicLinkGate)) {
      return;
    }

    setPending("copy-link");

    try {
      await copyToClipboard(getShareUrl(nextShareId), "Share link copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyEmbedSnippet(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-embed");

    try {
      await copyToClipboard(getEmbedCode(getEmbedUrl(nextShareId), "Essence Spline scene", resolvedShareSettings), "Embed code copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyPublicSceneApi(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-api");

    try {
      await copyToClipboard(getPublicSceneApiUrl(nextShareId), "Scene API URL copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyReactComponent(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-react");

    try {
      await copyToClipboard(getReactEmbedCode(getEmbedUrl(nextShareId), resolvedShareSettings), "React component copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyFetchHelper(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-fetch");

    try {
      await copyToClipboard(getSceneFetchCode(getPublicSceneApiUrl(nextShareId)), "Fetch helper copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copySwiftUIEmbed(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-swiftui");

    try {
      await copyToClipboard(getSwiftUIEmbedCode(getEmbedUrl(nextShareId)), "SwiftUI view copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copySwiftFetchHelper(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-swift-fetch");

    try {
      await copyToClipboard(getSwiftSceneFetchCode(getPublicSceneApiUrl(nextShareId)), "Swift fetch helper copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyAndroidComposeView(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-android");

    try {
      await copyToClipboard(getAndroidComposeEmbedCode(getEmbedUrl(nextShareId)), "Android Compose view copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyKotlinFetchHelper(nextShareId: string) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-kotlin-fetch");

    try {
      await copyToClipboard(getKotlinSceneFetchCode(getPublicSceneApiUrl(nextShareId)), "Kotlin fetch helper copied");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function copyPlatformEmbedPreset(nextShareId: string, presetId: PlatformEmbedPresetId) {
    if (!requireReviewGate(embedGate)) {
      return;
    }

    setPending("copy-platform");

    try {
      const preset = PLATFORM_EMBED_PRESETS.find((candidate) => candidate.id === presetId);
      await copyToClipboard(
        getPlatformEmbedPresetCode(presetId, {
          embedOptions: resolvedShareSettings,
          embedUrl: getEmbedUrl(nextShareId),
          sceneName: "Essence Spline scene",
          shareUrl: getShareUrl(nextShareId),
        }),
        `${preset?.label ?? "Platform"} embed copied`,
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Copy failed");
    } finally {
      setPending(null);
    }
  }

  async function handlePublish() {
    if (!requireReviewGate(publicLinkGate)) {
      return;
    }

    setPending("publish");

    try {
      const response = await publishProject(projectId);
      if (response.project.shareId) {
        await navigator.clipboard?.writeText(getShareUrl(response.project.shareId)).catch(() => undefined);
      }
      toast.success("Project published");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPending(null);
    }
  }

  async function handleUnpublish() {
    setPending("unpublish");

    try {
      await unpublishProject(projectId);
      toast.success("Share link disabled");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unpublish failed");
    } finally {
      setPending(null);
    }
  }

  async function handleShareSettingsChange(updates: Partial<ShareSettings>, pendingKey: "embed-settings" | "permission" = "permission") {
    setPending(pendingKey);

    try {
      await updateProject(projectId, {
        shareSettings: {
          ...resolvedShareSettings,
          ...updates,
        },
      });
      toast.success(pendingKey === "embed-settings" ? "Embed settings updated" : "Share permissions updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Share setting update failed");
    } finally {
      setPending(null);
    }
  }

  function handlePermissionChange(permission: SharePermission, value: boolean) {
    return handleShareSettingsChange({ [permission]: value }, "permission");
  }

  async function handlePolicyTemplateChange(templateId: ScenePermissionPolicyTemplateId) {
    const template = scenePermissionPolicyTemplates.find((candidate) => candidate.id === templateId);

    setPending("policy-template");

    try {
      await updateProject(projectId, {
        shareSettings: applyScenePermissionPolicyTemplate(resolvedShareSettings, templateId, {
          reviewerName: "Project owner",
        }),
      });
      toast.success(`${template?.label ?? "Policy"} template applied`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Policy template update failed");
    } finally {
      setPending(null);
    }
  }

  function downloadViewerPackage(nextShareId: string) {
    if (!requireReviewGate(appPackageGate)) {
      return;
    }

    window.location.assign(getViewerPackageUrl(nextShareId));
    toast.success("Viewer package download started");
  }

  function downloadSelfHostedPackage(nextShareId: string) {
    if (!requireReviewGate(appPackageGate)) {
      return;
    }

    window.location.assign(getSelfHostedPackageUrl(nextShareId));
    toast.success("Self-hosted export download started");
  }

  function downloadAppPackage(nextShareId: string, presetId: AppPackagePresetId) {
    if (!requireReviewGate(appPackageGate)) {
      return;
    }

    window.location.assign(getAppPackageUrl(nextShareId, presetId));
    toast.success(`${APP_PACKAGE_PRESETS.find((preset) => preset.id === presetId)?.label ?? "App"} package download started`);
  }

  if (!published || !shareId) {
    return (
      <Button className="w-full justify-start gap-2" disabled={pending === "publish"} size="sm" variant="ghost" onClick={() => void handlePublish()}>
        {pending === "publish" ? <Loader2 className="size-4 animate-spin" /> : publicLinkGate.allowed ? <Share2 className="size-4" /> : <ShieldAlert className="size-4 text-amber-500" />}
        {publicLinkGate.allowed ? "Publish link" : "Approve to publish"}
      </Button>
    );
  }

  const shareActionPending = pending !== null && pending !== "publish";

  return (
    <div className="flex gap-1">
      <Button className="min-w-0 flex-1 justify-start gap-2" disabled={pending === "copy-link"} size="sm" variant="ghost" onClick={() => void copyShareLink(shareId)}>
        {pending === "copy-link" ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
        Copy link
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              aria-label="Share options"
              className="size-8 shrink-0"
              disabled={shareActionPending}
              size="icon"
              variant="ghost"
            >
              {shareActionPending ? <Loader2 className="size-4 animate-spin" /> : <Code2 className="size-4" />}
            </Button>
          }
        />
        <DropdownMenuContent className="min-w-48">
          <DropdownMenuLabel>Copy</DropdownMenuLabel>
          <DropdownMenuItem disabled={!canCopyEmbed} onClick={() => void copyReactComponent(shareId)}>
            <FileCode2 className="size-4" />
            Copy React component
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canCopyFetchHelper} onClick={() => void copyFetchHelper(shareId)}>
            <Braces className="size-4" />
            Copy fetch helper
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canCopyEmbed} onClick={() => void copySwiftUIEmbed(shareId)}>
            <Smartphone className="size-4" />
            Copy SwiftUI view
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canCopyFetchHelper} onClick={() => void copySwiftFetchHelper(shareId)}>
            <Braces className="size-4" />
            Copy Swift fetch helper
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canCopyEmbed} onClick={() => void copyAndroidComposeView(shareId)}>
            <Smartphone className="size-4" />
            Copy Android Compose view
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canCopyFetchHelper} onClick={() => void copyKotlinFetchHelper(shareId)}>
            <Braces className="size-4" />
            Copy Kotlin fetch helper
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!canCopyEmbed}>
              <Globe2 className="size-4" />
              Platform embeds
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-40">
              {PLATFORM_EMBED_PRESETS.map((preset) => (
                <DropdownMenuItem key={preset.id} onClick={() => void copyPlatformEmbedPreset(shareId, preset.id)}>
                  <Code2 className="size-4" />
                  {preset.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canCopyEmbed} onClick={() => void copyEmbedSnippet(shareId)}>
            <Code2 className="size-4" />
            Copy embed code
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canDownloadViewer} onClick={() => downloadViewerPackage(shareId)}>
            <Download className="size-4" />
            Download viewer HTML
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canDownloadViewer} onClick={() => downloadSelfHostedPackage(shareId)}>
            <Download className="size-4" />
            Download self-hosted HTML
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={!canDownloadViewer}>
              <Download className="size-4" />
              App packages
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-48">
              {APP_PACKAGE_PRESETS.map((preset) => (
                <DropdownMenuItem key={preset.id} onClick={() => downloadAppPackage(shareId, preset.id)}>
                  {preset.id === "capacitor" ? <Smartphone className="size-4" /> : <Globe2 className="size-4" />}
                  {preset.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem disabled={!canCopyPublicApi} onClick={() => void copyPublicSceneApi(shareId)}>
            <Braces className="size-4" />
            Copy API URL
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Permissions</DropdownMenuLabel>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger disabled={pending === "policy-template"}>
              <ShieldAlert className="size-4" />
              Policy templates
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-56">
              {scenePermissionPolicyTemplates.map((template) => (
                <DropdownMenuItem key={template.id} onClick={() => void handlePolicyTemplateChange(template.id)}>
                  {template.id === "api-partner" ? <Braces className="size-4" /> : template.id === "app-package-release" ? <Download className="size-4" /> : <Globe2 className="size-4" />}
                  {template.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuCheckboxItem checked={resolvedShareSettings.allowView} onCheckedChange={(checked) => void handlePermissionChange("allowView", checked)}>
            Public page
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={resolvedShareSettings.allowEmbed} onCheckedChange={(checked) => void handlePermissionChange("allowEmbed", checked)}>
            Embeds
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={resolvedShareSettings.allowPublicApi} onCheckedChange={(checked) => void handlePermissionChange("allowPublicApi", checked)}>
            Scene API
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={resolvedShareSettings.allowCodeExport} onCheckedChange={(checked) => void handlePermissionChange("allowCodeExport", checked)}>
            Code snippets
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem checked={resolvedShareSettings.allowViewerDownload} onCheckedChange={(checked) => void handlePermissionChange("allowViewerDownload", checked)}>
            Viewer download
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Embed display</DropdownMenuLabel>
          <DropdownMenuCheckboxItem
            checked={resolvedShareSettings.embedLayout === "responsive"}
            onCheckedChange={(checked) => void handleShareSettingsChange({ embedLayout: checked ? "responsive" : "fixed" }, "embed-settings")}
          >
            Responsive iframe
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={resolvedShareSettings.embedTransparentBackground}
            onCheckedChange={(checked) => void handleShareSettingsChange({ embedTransparentBackground: checked }, "embed-settings")}
          >
            Transparent background
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={resolvedShareSettings.embedCameraControls === "orbit"}
            onCheckedChange={(checked) => void handleShareSettingsChange({ embedCameraControls: checked ? "orbit" : "locked" }, "embed-settings")}
          >
            Camera controls
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={resolvedShareSettings.embedShowGrid}
            onCheckedChange={(checked) => void handleShareSettingsChange({ embedShowGrid: checked }, "embed-settings")}
          >
            Floor grid
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={resolvedShareSettings.embedShowNavigation}
            onCheckedChange={(checked) => void handleShareSettingsChange({ embedShowNavigation: checked }, "embed-settings")}
          >
            Scene navigation
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => void handleUnpublish()}>
            <Unlink className="size-4" />
            Disable share link
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
