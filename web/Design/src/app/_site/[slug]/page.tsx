import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import {
  getPublishedWebsiteBySlug,
  recordWebsiteAnalyticsEvent,
  type WebsitePublishDetail,
} from "@/db/website-publishing";
import { PublishedWebsiteView } from "@/features/website/published-website-view";
import {
  createWebsiteStructuredData,
  stringifyStructuredData,
} from "@/features/website/website-structured-data";

type PublishedSitePageProps = {
  params: Promise<{
    slug: string;
  }>;
  searchParams: Promise<{
    submitted?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PublishedSitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const website = await getPublishedWebsiteBySlug(slug);

  if (!website) {
    return {};
  }

  return {
    alternates: {
      canonical: `${getAppUrl()}/site/${website.slug}`,
    },
    title: website.seoTitle,
    description: website.seoDescription,
    openGraph: {
      title: website.seoTitle,
      description: website.seoDescription,
      type: "website",
    },
  };
}

export default async function PublishedSitePage({
  params,
  searchParams,
}: PublishedSitePageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const website = await getPublishedWebsiteBySlug(slug);

  if (!website) {
    notFound();
  }

  await trackWebsiteView(website);
  const structuredData = createWebsiteStructuredData({
    appUrl: getAppUrl(),
    slug: website.slug,
    model: website.model,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: stringifyStructuredData(structuredData),
        }}
      />
      <PublishedWebsiteView
        slug={website.slug}
        model={website.model}
        submitted={query.submitted === "1"}
      />
    </>
  );
}

async function trackWebsiteView(website: WebsitePublishDetail) {
  try {
    const requestHeaders = await headers();

    await recordWebsiteAnalyticsEvent({
      publishId: website.id,
      projectId: website.projectId,
      eventType: "view",
      path: `/site/${website.slug}`,
      referrer: requestHeaders.get("referer"),
      userAgent: requestHeaders.get("user-agent"),
    });
  } catch (error) {
    console.error("Failed to record website view", error);
  }
}

function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://essence-studio-omega.vercel.app"
  ).replace(/\/$/, "");
}
