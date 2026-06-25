export type WebsiteDomainRoutingRecord = {
  host: string;
  type: "A" | "CNAME";
  value: string;
};

export type WebsiteDomainRoutingPlan = {
  domain: string;
  record: WebsiteDomainRoutingRecord;
  isApexDomain: boolean;
};

const vercelApexAddress = "76.76.21.21";
const vercelSubdomainTarget = "cname.vercel-dns-0.com";

export function createWebsiteDomainRoutingPlan(
  value: string,
): WebsiteDomainRoutingPlan | null {
  const domain = normalizeDomain(value);

  if (!domain) return null;

  const isApexDomain = domain.split(".").length === 2;

  return {
    domain,
    isApexDomain,
    record: isApexDomain
      ? {
          host: "@",
          type: "A",
          value: vercelApexAddress,
        }
      : {
          host: domain,
          type: "CNAME",
          value: vercelSubdomainTarget,
        },
  };
}

function normalizeDomain(value: string) {
  const domain = value
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");

  return domain || null;
}
