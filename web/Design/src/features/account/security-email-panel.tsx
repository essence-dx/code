import { ExternalLink, MailCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountProfile } from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { AccountSettingsCopy } from "@/features/account/account-settings-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

type SecurityEmailPanelProps = {
  copy: AccountSettingsCopy;
  profile: AccountProfile;
  emails: AuthEmailSummary[];
  sendVerificationEmailAction: ServerAction;
};

export function SecurityEmailPanel({
  copy,
  profile,
  emails,
  sendVerificationEmailAction,
}: SecurityEmailPanelProps) {
  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <MailCheck className="h-4 w-4 text-muted-foreground" />
            {copy.emailSecurity}
          </h3>
          <p className="text-xs text-muted-foreground">
            {copy.emailSecurityDescription}
          </p>
        </div>
        <Badge variant={profile.emailVerified ? "secondary" : "outline"}>
          {profile.emailVerified ? copy.verified : copy.unverified}
        </Badge>
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-email">{copy.emailAddress}</Label>
        <div className="flex gap-2">
          <Input
            id="account-email"
            value={profile.email}
            readOnly
            className="min-w-0"
          />
          {!profile.emailVerified ? (
            <form action={sendVerificationEmailAction}>
              <Button type="submit" variant="outline">
                <MailCheck className="h-4 w-4" />
                {copy.sendCode}
              </Button>
            </form>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        {emails.length ? (
          emails.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
            >
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-medium">{item.subject}</p>
                <p className="text-xs text-muted-foreground">
                  {copy.deliveryStatus(
                    item.deliveryStatus,
                    new Date(item.createdAt).toLocaleString(),
                  )}
                </p>
                {item.errorMessage ? (
                  <p className="line-clamp-2 text-xs text-destructive">
                    {item.errorMessage}
                  </p>
                ) : null}
              </div>
              {item.previewUrl ? (
                <Button asChild variant="ghost" size="icon-sm">
                  <a
                    href={item.previewUrl}
                    aria-label={copy.openSecurityEmailLink}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            {copy.noSecurityEmails}
          </div>
        )}
      </div>
    </div>
  );
}
