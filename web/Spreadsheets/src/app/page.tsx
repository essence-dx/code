import { SpreadsheetShell } from "@/features/spreadsheet/components/spreadsheet-shell";
import {
  createEmbeddedWorkbook,
  embeddedWorkbookUser,
} from "@/features/workbooks/embedded-workbook";

export default function Home() {
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
