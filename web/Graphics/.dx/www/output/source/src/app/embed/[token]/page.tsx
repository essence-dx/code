import { notFound } from "next/navigation";
import { FileText, Layers3, Play } from "lucide-react";
import { exportDocumentToSvg } from "@/features/editor/exporters/svg-exporter";
import { getDocumentStats } from "@/features/editor/document-stats";
import { getSharedDesignFile } from "@/features/files/actions";
import { PublicRouteAnalyticsBeacon } from "@/features/public-route-analytics/components/public-route-analytics-beacon";

type EmbedPageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { token } = await params;
  const file = await getSharedDesignFile(token);

  if (!file) {
    notFound();
  }

  const svg = exportDocumentToSvg(file.document);
  const stats = getDocumentStats(file.document);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicRouteAnalyticsBeacon routeKind="embed" token={token} />
      <div className="grid min-h-screen grid-rows-[minmax(0,1fr)_auto]">
        <section className="grid min-h-0 overflow-auto p-3">
          <div
            className="m-auto max-h-full max-w-full overflow-auto rounded-md border border-border bg-card p-3 shadow-sm"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </section>
        <footer className="flex min-h-10 items-center justify-between gap-3 border-t border-border bg-card/95 px-3 py-2 text-xs">
          <div className="min-w-0">
            <div className="truncate font-medium">{file.name}</div>
            <div className="text-muted-foreground">{stats.activePage.name}</div>
          </div>
          <div className="flex shrink-0 items-center gap-2 text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3.5" />
              {stats.pageCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers3 className="size-3.5" />
              {stats.layerCount}
            </span>
            <a
              href={`/share/${token}/prototype`}
              className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-foreground"
              target="_blank"
              rel="noreferrer"
            >
              <Play className="size-3.5" />
              Prototype
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
