import { NextResponse } from "next/server";

import {
  parseEnterpriseScimUserResource,
  validateScimBearerToken,
} from "@/features/security/enterprise-sso-scim-enforcement";

type ScimUserRouteContext = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: ScimUserRouteContext) {
  const auth = authorizeScimRequest(request);

  if (!auth.ok) return createScimError(auth.error, auth.status);

  const { userId } = await context.params;
  const user = parseEnterpriseScimUserResource({
    ...(await request.json()),
    id: userId,
  });

  if (!user) return createScimError("Invalid SCIM user resource.", 400);

  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: userId,
    userName: user.email,
    displayName: user.displayName,
    active: user.active,
    emails: [{ value: user.email, primary: true }],
    groups: user.groups.map((group) => ({ display: group, value: group })),
  });
}

export async function DELETE(request: Request) {
  const auth = authorizeScimRequest(request);

  if (!auth.ok) return createScimError(auth.error, auth.status);

  return new Response(null, { status: 204 });
}

function authorizeScimRequest(request: Request) {
  return validateScimBearerToken({
    authorization: request.headers.get("authorization"),
    expectedToken:
      process.env.ESSENCE_SCIM_BEARER_TOKEN ?? process.env.SCIM_BEARER_TOKEN,
  });
}

function createScimError(error: string, status: number) {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: error,
      status: String(status),
    },
    { status },
  );
}
