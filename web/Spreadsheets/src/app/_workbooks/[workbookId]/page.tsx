import { SpreadsheetShell } from "@/features/spreadsheet/components/spreadsheet-shell";
import {
  createEmbeddedWorkbook,
  embeddedWorkbookUser,
} from "@/features/workbooks/embedded-workbook";

export default async function WorkbookPage({
  params,
}: {
  params: Promise<{ workbookId: string }>;
}) {
  await params;
  const workbook = createEmbeddedWorkbook();

  return (
    <SpreadsheetShell
      embedded
      workbook={workbook}
      activityLogs={[]}
      currentUser={{
        email: embeddedWorkbookUser.email,
        name: embeddedWorkbookUser.name,
      }}
    />
  );
}
