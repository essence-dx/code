"use client";

import { CheckCircle2, Globe2, ShieldCheck, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WebsitePublishSummary } from "@/db/website-publishing";
import { createWebsiteDomainRoutingPlan } from "@/features/website/website-domain-routing";
import type { WebsitePublisherCopy } from "@/features/website/website-publisher-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

type WebsiteDomainManagerProps = {
  publish: WebsitePublishSummary;
  copy: WebsitePublisherCopy;
  addDomainAction: ServerAction;
  attachDomainAction: ServerAction;
  refreshDomainAction: ServerAction;
  verifyDomainAction: ServerAction;
  deleteDomainAction: ServerAction;
};

export function WebsiteDomainManager({
  publish,
  copy,
  addDomainAction,
  attachDomainAction,
  refreshDomainAction,
  verifyDomainAction,
  deleteDomainAction,
}: WebsiteDomainManagerProps) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-muted p-2 text-muted-foreground">
          <Globe2 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{copy.customDomains}</p>
          <p className="text-xs text-muted-foreground">
            {copy.customDomainsDescription}
          </p>
        </div>
      </div>

      <form action={addDomainAction} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input type="hidden" name="publishId" value={publish.id} />
        <div className="space-y-1.5">
          <Label htmlFor={`domain-${publish.id}`}>{copy.domain}</Label>
          <Input
            id={`domain-${publish.id}`}
            name="domain"
            placeholder={copy.domainPlaceholder}
            autoCapitalize="none"
            autoCorrect="off"
          />
        </div>
        <Button type="submit" className="self-end">
          <ShieldCheck className="h-4 w-4" />
          {copy.addDomain}
        </Button>
      </form>

      {publish.customDomains.length ? (
        <div className="mt-3 grid gap-2">
          {publish.customDomains.map((domain) => (
            <div key={domain.id} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {domain.domain}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {copy.verificationRecord}
                  </p>
                </div>
                <Badge
                  variant={domain.status === "verified" ? "secondary" : "outline"}
                  className="gap-1"
                >
                  {domain.status === "verified" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : null}
                  {copy.domainStatus[domain.status]}
                </Badge>
                <Badge
                  variant={
                    domain.platformStatus === "attached"
                      ? "secondary"
                      : domain.platformStatus === "error"
                        ? "destructive"
                        : "outline"
                  }
                >
                  {copy.platformDomainStatus?.[domain.platformStatus] ??
                    domain.platformStatus}
                </Badge>
              </div>
              <dl className="mt-3 grid gap-2 text-xs">
                <DomainRecord label={copy.txtName} value={domain.verificationName} />
                <DomainRecord label={copy.txtValue} value={domain.verificationValue} />
              </dl>
              <DomainRoutingPlan
                domain={domain.domain}
                isVerified={domain.status === "verified"}
                copy={copy}
              />
              {domain.platformError ? (
                <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {domain.platformError}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <form action={verifyDomainAction}>
                  <input type="hidden" name="domainId" value={domain.id} />
                  <Button type="submit" variant="outline" size="sm">
                    <ShieldCheck className="h-4 w-4" />
                    {copy.verifyDomain}
                  </Button>
                </form>
                {domain.status === "verified" ? (
                  <form
                    action={
                      domain.platformStatus === "attached"
                        ? refreshDomainAction
                        : attachDomainAction
                    }
                  >
                    <input type="hidden" name="domainId" value={domain.id} />
                    <Button type="submit" variant="outline" size="sm">
                      <Globe2 className="h-4 w-4" />
                      {domain.platformStatus === "attached"
                        ? copy.refreshDomain ?? "Check status"
                        : copy.attachDomain ?? "Attach domain"}
                    </Button>
                  </form>
                ) : null}
                <form action={deleteDomainAction}>
                  <input type="hidden" name="domainId" value={domain.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    <Trash2 className="h-4 w-4" />
                    {copy.removeDomain}
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-3 rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
          {copy.noDomains}
        </div>
      )}
    </div>
  );
}

function DomainRoutingPlan({
  domain,
  isVerified,
  copy,
}: {
  domain: string;
  isVerified: boolean;
  copy: WebsitePublisherCopy;
}) {
  const plan = createWebsiteDomainRoutingPlan(domain);

  if (!plan) return null;

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold">
            {copy.platformRouting ?? "Platform routing"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isVerified
              ? copy.platformRoutingReady ??
                "Add this record so the hosting platform can serve this domain."
              : copy.platformRoutingPending ??
                "Verify the TXT record before adding the hosting record."}
          </p>
        </div>
        <Badge variant={isVerified ? "secondary" : "outline"}>
          {isVerified
            ? copy.platformRoutingStatus?.ready ?? "ready"
            : copy.platformRoutingStatus?.waiting ?? "waiting"}
        </Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-xs">
        <DomainRecord
          label={copy.routingHost ?? "Host"}
          value={plan.record.host}
        />
        <DomainRecord
          label={copy.routingType ?? "Type"}
          value={plan.record.type}
        />
        <DomainRecord
          label={copy.routingValue ?? "Value"}
          value={plan.record.value}
        />
      </dl>
    </div>
  );
}

function DomainRecord({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[96px_1fr]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 rounded-md bg-muted px-2 py-1 font-mono text-[11px] text-foreground">
        <span className="block truncate">{value}</span>
      </dd>
    </div>
  );
}
