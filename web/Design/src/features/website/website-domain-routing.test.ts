import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { createWebsiteDomainRoutingPlan } from "@/features/website/website-domain-routing";

describe("website domain routing", () => {
  test("creates an apex A record plan", () => {
    const plan = createWebsiteDomainRoutingPlan("https://Example.com/path");

    assert.deepEqual(plan?.record, {
      host: "@",
      type: "A",
      value: "76.76.21.21",
    });
    assert.equal(plan?.isApexDomain, true);
    assert.equal(plan?.domain, "example.com");
  });

  test("creates a subdomain CNAME plan", () => {
    const plan = createWebsiteDomainRoutingPlan("www.example.com.");

    assert.deepEqual(plan?.record, {
      host: "www.example.com",
      type: "CNAME",
      value: "cname.vercel-dns-0.com",
    });
    assert.equal(plan?.isApexDomain, false);
  });
});
