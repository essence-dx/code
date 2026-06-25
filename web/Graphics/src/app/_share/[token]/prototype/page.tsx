import { notFound } from "next/navigation";
import { PrototypePreview } from "@/features/editor/components/prototype-preview";
import { getPrototypePreviewModel } from "@/features/editor/prototype-preview";
import { getSharedDesignFile } from "@/features/files/actions";
import { PublicRouteAnalyticsBeacon } from "@/features/public-route-analytics/components/public-route-analytics-beacon";

type SharedPrototypePageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function SharedPrototypePage({
  params,
}: SharedPrototypePageProps) {
  const { token } = await params;
  const file = await getSharedDesignFile(token);

  if (!file) {
    notFound();
  }

  return (
    <>
      <PublicRouteAnalyticsBeacon routeKind="prototype" token={token} />
      <PrototypePreview
        fileName={file.name}
        model={getPrototypePreviewModel(file.document)}
      />
    </>
  );
}
