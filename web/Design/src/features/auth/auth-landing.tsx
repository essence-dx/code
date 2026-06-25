"use client";

import {
  FolderKanban,
  ImagePlus,
  LayoutTemplate,
  ShieldCheck,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { AuthCard } from "@/features/auth/auth-card";
import { AuthLocaleSelect, useAuthLocale } from "@/features/auth/auth-locale";
import {
  getAuthCopy,
  type AuthFoundationId,
} from "@/features/auth/auth-localization";
import { productName } from "@/lib/product";

const foundation: Array<{
  id: AuthFoundationId;
  icon: typeof ImagePlus;
}> = [
  { id: "createDesigns", icon: ImagePlus },
  { id: "manageProjects", icon: FolderKanban },
  { id: "reuseTemplates", icon: LayoutTemplate },
  { id: "protectAccount", icon: ShieldCheck },
];

export function AuthLanding() {
  const { locale, updateLocale } = useAuthLocale();
  const copy = getAuthCopy(locale);

  return (
    <main className="grid min-h-dvh bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_480px]">
      <section className="flex min-h-[50dvh] flex-col justify-between border-b border-border p-6 lg:min-h-dvh lg:border-b-0 lg:border-r xl:p-10">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">{productName}</Badge>
            <AuthLocaleSelect
              label={copy.language}
              locale={locale}
              onLocaleChange={updateLocale}
            />
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-normal md:text-6xl">
            {copy.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {copy.heroDescription}
          </p>
        </div>
        <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {foundation.map(({ id, icon: Icon }) => (
            <div
              className="flex items-center gap-3 rounded-md border border-border bg-card p-3 text-sm"
              key={id}
            >
              <Icon className="h-4 w-4 text-muted-foreground" />
              {copy.foundation[id]}
            </div>
          ))}
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <AuthCard
          copy={copy}
          locale={locale}
          onLocaleChange={updateLocale}
          showLocaleSelect={false}
        />
      </section>
    </main>
  );
}
