import { Button } from "@/components/ui/button";
import {
  revokeUserSessionsAction,
  setUserEmailVerifiedAction,
} from "@/features/dashboard/actions";
import type { DashboardUserRow } from "@/features/dashboard/dashboard-service";

export function UserActions({
  row,
  currentUserId,
}: {
  row: DashboardUserRow;
  currentUserId: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2">
      <form action={setUserEmailVerifiedAction}>
        <input type="hidden" name="userId" value={row.id} />
        <input
          type="hidden"
          name="emailVerified"
          value={row.emailVerified ? "false" : "true"}
        />
        <Button type="submit" variant="outline" size="xs">
          {row.emailVerified ? "Unverify" : "Verify"}
        </Button>
      </form>
      <form action={revokeUserSessionsAction}>
        <input type="hidden" name="userId" value={row.id} />
        <Button
          type="submit"
          variant="outline"
          size="xs"
          disabled={row.id === currentUserId || row.activeSessions === 0}
        >
          Revoke sessions
        </Button>
      </form>
    </div>
  );
}
