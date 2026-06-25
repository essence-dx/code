"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PublicDesignViewer } from "@/features/editor/components/public-design-viewer";
import { getPublicSurfaceCopy } from "@/features/editor/public-surface-localization";
import type { DesignDocument } from "@/features/editor/types";
import {
  LocaleSelect,
  useLocalePreference,
} from "@/features/localization/locale-preference";

type PublicViewShellProps = {
  document: DesignDocument;
  mode: "public" | "private";
  projectName: string;
  actionHref: string;
};

export function PublicViewShell({
  document,
  mode,
  projectName,
  actionHref,
}: PublicViewShellProps) {
  const { locale, updateLocale } = useLocalePreference();
  const copy = getPublicSurfaceCopy(locale);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted-foreground">
              {copy.viewLabel[mode]}
            </p>
            <h1 className="truncate text-xl font-semibold">{projectName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LocaleSelect
              label={copy.language}
              locale={locale}
              onLocaleChange={updateLocale}
            />
            <Button asChild variant="outline">
              <Link href={actionHref}>{copy.viewAction[mode]}</Link>
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">
        <PublicDesignViewer document={document} />
      </div>
    </main>
  );
}
