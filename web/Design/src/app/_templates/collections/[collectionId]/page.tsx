import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createDesignFromCatalogTemplateAction } from "@/app/designs/actions/project";
import { TemplateCollectionDetail } from "@/features/templates/template-collection-detail";
import {
  getTemplateCollectionResult,
  templateCollections,
} from "@/features/templates/template-collections";
import { productName } from "@/lib/product";

type TemplateCollectionPageProps = {
  params: Promise<{
    collectionId: string;
  }>;
};

export function generateStaticParams() {
  return templateCollections.map((collection) => ({
    collectionId: collection.id,
  }));
}

export async function generateMetadata({
  params,
}: TemplateCollectionPageProps): Promise<Metadata> {
  const { collectionId } = await params;
  const result = getTemplateCollectionResult(collectionId);

  if (!result) {
    return {};
  }

  return {
    title: `${result.collection.name} | ${productName}`,
    description: result.collection.description,
  };
}

export default async function TemplateCollectionPage({
  params,
}: TemplateCollectionPageProps) {
  const { collectionId } = await params;
  const result = getTemplateCollectionResult(collectionId);

  if (!result) {
    notFound();
  }

  return (
    <TemplateCollectionDetail
      result={result}
      createFromCatalogTemplateAction={createDesignFromCatalogTemplateAction}
    />
  );
}
