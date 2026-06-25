import { notFound, redirect } from "next/navigation";
import { acceptWorkbookShareLink } from "@/features/workbooks/workbook-sharing-service";
import { requireUser } from "@/lib/session";

export default async function AcceptWorkbookSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const user = await requireUser();
  const { token } = await params;
  const workbookId = await acceptWorkbookShareLink(
    {
      id: user.id,
      email: user.email,
    },
    token,
  );

  if (!workbookId) {
    notFound();
  }

  redirect(`/workbooks/${workbookId}`);
}
