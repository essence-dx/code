import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createDesignFromCatalogTemplateAction } from "@/app/designs/actions/project";
import { TemplateCatalogDetail } from "@/features/templates/template-catalog-detail";
import {
  getRelatedTemplateCatalogItems,
  getTemplateCatalogItem,
  templateCatalogItems,
} from "@/features/templates/template-catalog";
import { productName } from "@/lib/product";

type TemplatePageProps = {
  params: Promise<{
    templateId: string;
  }>;
};

export function generateStaticParams() {
  return templateCatalogItems.map((template) => ({
    templateId: template.id,
  }));
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { templateId } = await params;
  const template = getTemplateCatalogItem(templateId);

  if (!template) {
    return {};
  }

  return {
    title: `${template.name} template | ${productName}`,
    description: template.description,
  };
}

export default async function TemplatePage({ params }: TemplatePageProps) {
  const { templateId } = await params;
  const template = getTemplateCatalogItem(templateId);

  if (!template) {
    notFound();
  }

  return (
    <TemplateCatalogDetail
      template={template}
      relatedTemplates={getRelatedTemplateCatalogItems(template, 3)}
      createFromCatalogTemplateAction={createDesignFromCatalogTemplateAction}
    />
  );
}
