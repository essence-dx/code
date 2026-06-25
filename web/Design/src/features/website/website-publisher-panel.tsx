"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  CheckCircle2,
  Eye,
  ExternalLink,
  Globe2,
  Link2,
  Monitor,
  MousePointerClick,
  PauseCircle,
  Send,
  Smartphone,
  Tablet,
  TriangleAlert,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  WebsiteFormSubmissionSummary,
  WebsitePublishSummary,
} from "@/db/website-publishing";
import type { EditorLocale } from "@/features/editor/editor-localization";
import type {
  ProjectSummary,
  WebsiteNavigationStyle,
} from "@/features/editor/types";
import { WebsiteDomainManager } from "@/features/website/website-domain-manager";
import { getWebsitePublisherCopy } from "@/features/website/website-publisher-localization";
import { websiteNavigationStyles } from "@/features/website/website-model";
import {
  createWebsiteSeoAudit,
  type WebsiteSeoAuditCode,
  type WebsiteSeoAuditItem,
} from "@/features/website/website-seo-audit";

type ServerAction = (formData: FormData) => Promise<void> | void;
type PreviewWidth = "mobile" | "tablet" | "desktop";

type WebsitePublisherPanelProps = {
  locale: EditorLocale;
  appUrl: string;
  projects: ProjectSummary[];
  publishes: WebsitePublishSummary[];
  submissions: WebsiteFormSubmissionSummary[];
  publishAction: ServerAction;
  unpublishAction: ServerAction;
  createLinkInBioAction: ServerAction;
  addDomainAction: ServerAction;
  attachDomainAction: ServerAction;
  refreshDomainAction: ServerAction;
  verifyDomainAction: ServerAction;
  deleteDomainAction: ServerAction;
};

const previewWidths: Record<PreviewWidth, number> = {
  mobile: 390,
  tablet: 768,
  desktop: 1180,
};

export function WebsitePublisherPanel({
  locale,
  appUrl,
  projects,
  publishes,
  submissions,
  publishAction,
  unpublishAction,
  createLinkInBioAction,
  addDomainAction,
  attachDomainAction,
  refreshDomainAction,
  verifyDomainAction,
  deleteDomainAction,
}: WebsitePublisherPanelProps) {
  const activeProjects = useMemo(
    () => projects.filter((project) => !project.deletedAt),
    [projects],
  );
  const [selectedSlug, setSelectedSlug] = useState(publishes[0]?.slug ?? "");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [publicSlug, setPublicSlug] = useState("");
  const [websiteTitle, setWebsiteTitle] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [previewWidth, setPreviewWidth] = useState<PreviewWidth>("desktop");
  const [navigationStyle, setNavigationStyle] =
    useState<WebsiteNavigationStyle>("top");
  const copy = getWebsitePublisherCopy(locale);
  const selectedProject = useMemo(
    () =>
      activeProjects.find((project) => project.id === selectedProjectId) ??
      null,
    [activeProjects, selectedProjectId],
  );
  const seoAudit = useMemo(
    () =>
      createWebsiteSeoAudit({
        projectName: selectedProject?.name,
        title: websiteTitle,
        seoTitle,
        seoDescription,
        slug: publicSlug,
      }),
    [publicSlug, selectedProject?.name, seoDescription, seoTitle, websiteTitle],
  );
  const selectedPublish = useMemo(
    () =>
      publishes.find((publish) => publish.slug === selectedSlug) ??
      publishes[0] ??
      null,
    [publishes, selectedSlug],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form
          action={createLinkInBioAction}
          className="grid gap-3 rounded-md border border-border bg-muted/30 p-3 md:grid-cols-[1fr_auto]"
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4 text-muted-foreground" />
              {copy.linkInBioStarterTitle}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {copy.linkInBioStarterDescription}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[220px_auto] md:self-end">
            <Input
              name="name"
              placeholder={copy.linkInBioStarterName}
              aria-label={copy.linkInBioStarterName}
            />
            <Button type="submit">
              <Link2 className="h-4 w-4" />
              {copy.createLinkInBioStarter}
            </Button>
          </div>
        </form>

        <form action={publishAction} className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="website-project">{copy.design}</Label>
            <select
              id="website-project"
              name="projectId"
              value={selectedProjectId}
              onChange={(event) => setSelectedProjectId(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              required
            >
              <option value="">{copy.selectDesign}</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="website-slug">{copy.publicSlug}</Label>
            <Input
              id="website-slug"
              name="slug"
              value={publicSlug}
              onChange={(event) => setPublicSlug(event.target.value)}
              placeholder="spring-campaign"
              maxLength={80}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website-title">{copy.websiteTitle}</Label>
            <Input
              id="website-title"
              name="title"
              value={websiteTitle}
              onChange={(event) => setWebsiteTitle(event.target.value)}
              placeholder="Campaign landing page"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website-seo-title">{copy.seoTitle}</Label>
            <Input
              id="website-seo-title"
              name="seoTitle"
              value={seoTitle}
              onChange={(event) => setSeoTitle(event.target.value)}
              placeholder="Campaign landing page"
              maxLength={120}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website-seo-description">
              {copy.seoDescription}
            </Label>
            <Textarea
              id="website-seo-description"
              name="seoDescription"
              value={seoDescription}
              onChange={(event) => setSeoDescription(event.target.value)}
              placeholder={copy.seoDescriptionPlaceholder}
              maxLength={180}
            />
          </div>
          <WebsiteSeoReadiness
            audit={seoAudit}
            copy={copy}
            className="md:col-span-2"
          />
          <div className="space-y-2 md:col-span-2">
            <input
              type="hidden"
              name="navigationStyle"
              value={navigationStyle}
            />
            <Label htmlFor="website-navigation-style">
              {copy.navigationStyle}
            </Label>
            <Select
              value={navigationStyle}
              onValueChange={(value) =>
                setNavigationStyle(value as WebsiteNavigationStyle)
              }
            >
              <SelectTrigger id="website-navigation-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {websiteNavigationStyles.map((style) => (
                  <SelectItem key={style} value={style}>
                    {copy.navigationStyles[style]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {copy.navigationStyleDescription}
            </p>
          </div>
          <Button type="submit" className="md:col-span-2">
            <Send className="h-4 w-4" />
            {copy.publishWebsite}
          </Button>
        </form>

        {publishes.length ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(previewWidths) as PreviewWidth[]).map(
                    (width) => (
                      <Button
                        key={width}
                        type="button"
                        variant={previewWidth === width ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => setPreviewWidth(width)}
                      >
                        {width === "mobile" ? (
                          <Smartphone className="h-4 w-4" />
                        ) : width === "tablet" ? (
                          <Tablet className="h-4 w-4" />
                        ) : (
                          <Monitor className="h-4 w-4" />
                        )}
                        {copy.previewWidth[width]}
                      </Button>
                    ),
                  )}
                </div>
                {selectedPublish ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={getWebsiteUrl(appUrl, selectedPublish.slug)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {copy.open}
                    </a>
                  </Button>
                ) : null}
              </div>
              {selectedPublish ? (
                <>
                  <div className="rounded-md border border-border bg-background p-3">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                      {copy.analytics}
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <WebsiteMetric
                        icon={<Eye className="h-4 w-4" />}
                        label={copy.views}
                        value={formatMetric(selectedPublish.viewCount)}
                      />
                      <WebsiteMetric
                        icon={<MousePointerClick className="h-4 w-4" />}
                        label={copy.clicks}
                        value={formatMetric(selectedPublish.clickCount)}
                      />
                      <WebsiteMetric
                        icon={<BarChart3 className="h-4 w-4" />}
                        label={copy.lastActivity}
                        value={formatDate(
                          selectedPublish.lastAnalyticsAt,
                          copy.noActivity,
                        )}
                      />
                    </div>
                  </div>
                  <WebsiteDomainManager
                    publish={selectedPublish}
                    copy={copy}
                    addDomainAction={addDomainAction}
                    attachDomainAction={attachDomainAction}
                    refreshDomainAction={refreshDomainAction}
                    verifyDomainAction={verifyDomainAction}
                    deleteDomainAction={deleteDomainAction}
                  />
                  <div className="overflow-auto rounded-md border border-border bg-muted/40 p-3">
                    <iframe
                      title={copy.previewTitle(selectedPublish.title)}
                      src={getWebsiteUrl(appUrl, selectedPublish.slug)}
                      className="mx-auto h-[520px] rounded-md border border-border bg-background"
                      style={{ width: previewWidths[previewWidth] }}
                    />
                  </div>
                </>
              ) : null}
            </div>

            <div className="space-y-2">
              {publishes.map((publish) => (
                <button
                  key={publish.id}
                  type="button"
                  onClick={() => setSelectedSlug(publish.slug)}
                  className="w-full rounded-md border border-border p-3 text-left text-sm transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{publish.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        /site/{publish.slug}
                      </p>
                    </div>
                    <Badge
                      variant={
                        publish.status === "published" ? "secondary" : "outline"
                      }
                    >
                      {copy.status[publish.status]}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {publish.projectName ?? copy.deletedDesign}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>
                      {copy.views}:{" "}
                      <strong className="font-medium text-foreground">
                        {formatMetric(publish.viewCount)}
                      </strong>
                    </span>
                    <span>
                      {copy.clicks}:{" "}
                      <strong className="font-medium text-foreground">
                        {formatMetric(publish.clickCount)}
                      </strong>
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            {copy.emptyWebsites}
          </div>
        )}

        {selectedPublish ? (
          <form action={unpublishAction}>
            <input type="hidden" name="publishId" value={selectedPublish.id} />
            <Button type="submit" variant="outline" size="sm">
              <PauseCircle className="h-4 w-4" />
              {copy.unpublishSelected}
            </Button>
          </form>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">{copy.recentSubmissions}</h3>
            <Badge variant="outline">{submissions.length}</Badge>
          </div>
          {submissions.length ? (
            <div className="grid gap-2 lg:grid-cols-2">
              {submissions.slice(0, 6).map((submission) => (
                <div
                  key={submission.id}
                  className="rounded-md border border-border p-3 text-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">
                      {submission.websiteTitle ?? copy.fallbackWebsiteTitle}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(submission.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                    {Object.entries(submission.payload)
                      .slice(0, 4)
                      .map(([key, value]) => (
                        <div key={key} className="grid grid-cols-[110px_1fr] gap-2">
                          <dt className="truncate">{key}</dt>
                          <dd className="truncate">
                            {Array.isArray(value) ? value.join(", ") : value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {copy.emptySubmissions}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function getWebsiteUrl(appUrl: string, slug: string) {
  return `${appUrl.replace(/\/$/, "")}/site/${slug}`;
}

function WebsiteSeoReadiness({
  audit,
  copy,
  className,
}: {
  audit: ReturnType<typeof createWebsiteSeoAudit>;
  copy: ReturnType<typeof getWebsitePublisherCopy>;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="rounded-md border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">
              {copy.seoReadinessTitle ?? "SEO readiness"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {copy.seoReadinessDescription ??
                "Check publish metadata before the site goes live."}
            </p>
          </div>
          <Badge variant={audit.score === audit.total ? "default" : "secondary"}>
            {audit.score}/{audit.total}
          </Badge>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {audit.items.map((item) => (
            <WebsiteSeoAuditRow key={item.code} item={item} copy={copy} />
          ))}
        </div>
      </div>
    </div>
  );
}

function WebsiteSeoAuditRow({
  item,
  copy,
}: {
  item: WebsiteSeoAuditItem;
  copy: ReturnType<typeof getWebsitePublisherCopy>;
}) {
  const isReady = item.status === "ok";

  return (
    <div className="flex items-start gap-2 rounded-md bg-background px-3 py-2 text-xs">
      {isReady ? (
        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
      ) : (
        <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
      )}
      <span className="text-muted-foreground">
        {copy.seoAuditLabels?.[item.code] ?? seoAuditLabelByCode[item.code]}
      </span>
    </div>
  );
}

const seoAuditLabelByCode: Record<WebsiteSeoAuditCode, string> = {
  design: "Select a design to publish.",
  title: "Use a readable website title.",
  "seo-title": "Write a focused SEO title.",
  description: "Add an 80 to 160 character SEO description.",
  slug: "Use lowercase words and hyphens for the slug.",
};

function WebsiteMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function formatMetric(value: number) {
  return new Intl.NumberFormat(undefined, {
    notation: value >= 10000 ? "compact" : "standard",
  }).format(value);
}

function formatDate(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleString() : fallback;
}
