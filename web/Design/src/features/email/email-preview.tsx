import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EmailModel } from "@/features/email/email-model";
import { EmailQaPanel } from "@/features/email/email-qa-panel";
import { createEmailQaReport } from "@/features/email/email-qa";

type EmailPreviewProps = {
  projectId: string;
  model: EmailModel;
  html: string;
};

export function EmailPreview({ projectId, model, html }: EmailPreviewProps) {
  const exportHref = `/email/${projectId}/export?subject=${encodeURIComponent(
    model.subject,
  )}&previewText=${encodeURIComponent(model.previewText)}&blockPack=${encodeURIComponent(
    model.blockPackId,
  )}`;
  const report = createEmailQaReport(model);

  return (
    <main className="min-h-dvh bg-background px-4 py-6 text-foreground">
      <div className="mx-auto grid max-w-6xl gap-4">
        <EmailQaPanel report={report} />
        <Card>
          <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Email preview</CardTitle>
              <CardDescription>{model.subject}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">{model.sections.length} sections</Badge>
              <Button asChild variant="outline">
                <Link href="/designs">Dashboard</Link>
              </Button>
              <Button asChild>
                <a href={exportHref}>Download HTML</a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <iframe
              title="Email HTML preview"
              srcDoc={html}
              className="h-[720px] w-full rounded-md border border-border bg-white"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
