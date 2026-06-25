"use client";

import {
  KeyRound,
  Monitor,
  Save,
  ShieldCheck,
  ShieldX,
  Trash2,
  UserRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AccountProfile,
  AccountSessionSummary,
} from "@/db/account-settings";
import type { AuthEmailSummary } from "@/db/auth-emails";
import type { TwoFactorProfile } from "@/db/two-factor";
import { getAccountSettingsCopy } from "@/features/account/account-settings-localization";
import { SecurityEmailPanel } from "@/features/account/security-email-panel";
import type { EditorLocale } from "@/features/editor/editor-localization";

type ServerAction = (formData: FormData) => Promise<void> | void;

type AccountSettingsPanelProps = {
  locale: EditorLocale;
  profile: AccountProfile;
  sessions: AccountSessionSummary[];
  twoFactor: TwoFactorProfile;
  authEmails: AuthEmailSummary[];
  updateProfileAction: ServerAction;
  sendVerificationEmailAction: ServerAction;
  revokeSessionAction: ServerAction;
  deleteAccountAction: ServerAction;
  enableTwoFactorAction: ServerAction;
  disableTwoFactorAction: ServerAction;
};

export function AccountSettingsPanel({
  locale,
  profile,
  sessions,
  twoFactor,
  authEmails,
  updateProfileAction,
  sendVerificationEmailAction,
  revokeSessionAction,
  deleteAccountAction,
  enableTwoFactorAction,
  disableTwoFactorAction,
}: AccountSettingsPanelProps) {
  const copy = getAccountSettingsCopy(locale);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={updateProfileAction} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="account-display-name">{copy.displayName}</Label>
            <div className="flex gap-2">
              <Input
                id="account-display-name"
                name="name"
                defaultValue={profile.name}
                maxLength={80}
                required
              />
              <Button type="submit" size="icon" aria-label={copy.saveAccountName}>
                <Save className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>

        <SecurityEmailPanel
          copy={copy}
          profile={profile}
          emails={authEmails}
          sendVerificationEmailAction={sendVerificationEmailAction}
        />

        <div className="space-y-3 rounded-md border border-border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4 text-muted-foreground" />
                {copy.twoFactor}
              </h3>
              <p className="text-xs text-muted-foreground">
                {copy.twoFactorDescription}
              </p>
            </div>
            <Badge variant={twoFactor.enabled ? "secondary" : "outline"}>
              {twoFactor.enabled ? copy.enabled : copy.off}
            </Badge>
          </div>

          {twoFactor.enabled ? (
            <form action={disableTwoFactorAction} className="space-y-2">
              <Label htmlFor="disable-two-factor-code">
                {copy.authenticatorCode}
              </Label>
              <div className="flex gap-2">
                <Input
                  id="disable-two-factor-code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="123456"
                  required
                />
                <Button
                  type="submit"
                  variant="outline"
                  size="icon"
                  aria-label={copy.disableTwoFactor}
                >
                  <ShieldX className="h-4 w-4" />
                </Button>
              </div>
            </form>
          ) : (
            <form action={enableTwoFactorAction} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-[128px_minmax(0,1fr)]">
                <img
                  src={twoFactor.qrDataUrl}
                  alt={copy.twoFactorQrAlt}
                  className="h-32 w-32 rounded-md border border-border bg-white p-2"
                  draggable={false}
                />
                <div className="space-y-2">
                  <Label htmlFor="two-factor-secret">{copy.manualKey}</Label>
                  <Input
                    id="two-factor-secret"
                    value={twoFactor.secret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Label htmlFor="enable-two-factor-code">
                    {copy.authenticatorCode}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="enable-two-factor-code"
                      name="code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="123456"
                      required
                    />
                    <Button
                      type="submit"
                      size="icon"
                      aria-label={copy.enableTwoFactor}
                    >
                      <ShieldCheck className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{copy.activeSessions}</h3>
          </div>
          {sessions.length ? (
            <div className="space-y-2">
              {sessions.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {item.userAgent || copy.unknownDevice}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {copy.sessionExpires(
                        item.ipAddress || copy.noIpRecorded,
                        new Date(item.expiresAt).toLocaleDateString(),
                      )}
                    </p>
                  </div>
                  <form action={revokeSessionAction}>
                    <input type="hidden" name="sessionId" value={item.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={copy.revokeSession}
                    >
                      <ShieldX className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              {copy.noActiveSessions}
            </div>
          )}
        </div>

        <form
          action={deleteAccountAction}
          className="space-y-3 rounded-md border border-destructive/30 p-3"
        >
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-destructive">
              {copy.deleteAccount}
            </h3>
            <p className="text-xs text-muted-foreground">
              {copy.deleteAccountDescription}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="delete-account-confirmation">
              {copy.deleteConfirmation}
            </Label>
            <div className="flex gap-2">
              <Input
                id="delete-account-confirmation"
                name="confirmation"
                autoComplete="off"
                placeholder="DELETE"
                required
              />
              <Button
                type="submit"
                variant="destructive"
                size="icon"
                aria-label={copy.deleteAccount}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
