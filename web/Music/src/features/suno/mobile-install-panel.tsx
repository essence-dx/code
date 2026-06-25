"use client";

import { CheckCircle2, Download, Loader2, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMobileInstall } from "@/features/system/use-mobile-install";

export function MobileInstallPanel() {
  const { choice, install, installing, snapshot } = useMobileInstall();
  const readyToInstall =
    !snapshot.installed &&
    snapshot.promptReady &&
    snapshot.manifestReady &&
    snapshot.serviceWorkerReady;
  const status = getInstallStatus(snapshot);
  const installMessage = getInstallMessage(status, choice);

  return (
    <Card className="border-white/10 bg-white/[0.04]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4 text-emerald-200" />
          Mobile install
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 rounded-md border border-white/10 bg-slate-950/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">{status.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {installMessage}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={status.ready ? "bg-emerald-400/15 text-emerald-200" : ""}
          >
            <CheckCircle2 className="mr-1 size-3" />
            {status.badge}
          </Badge>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
          <InstallFact
            label="Install shell"
            ready={snapshot.manifestReady}
            value={snapshot.manifestReady ? "ready" : "missing"}
          />
          <InstallFact
            label="Offline starter"
            ready={snapshot.serviceWorkerReady}
            value={
              snapshot.serviceWorkerSupported
                ? snapshot.serviceWorkerReady
                  ? "ready"
                  : "starting"
                : "not supported"
            }
          />
          <InstallFact
            label="Open mode"
            ready={snapshot.standalone}
            value={snapshot.standalone ? "installed" : "browser"}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-full gap-2 sm:w-auto"
          disabled={!readyToInstall || installing}
          onClick={() => {
            void install();
          }}
        >
          {installing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Download className="size-4" />
          )}
          Install on this device
        </Button>
        <p className="text-xs text-muted-foreground">
          Native phone apps remain a separate roadmap target; this makes the
          web studio easier to launch from supported mobile browsers.
        </p>
      </CardContent>
    </Card>
  );
}

function InstallFact({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
      <p className="font-medium text-foreground">{label}</p>
      <p className={ready ? "mt-1 text-emerald-200" : "mt-1"}>{value}</p>
    </div>
  );
}

function getInstallStatus(snapshot: {
  installed: boolean;
  manifestReady: boolean;
  promptReady: boolean;
  serviceWorkerReady: boolean;
}) {
  if (snapshot.installed) {
    return { badge: "installed", label: "Installed app mode", ready: true };
  }

  if (snapshot.promptReady && snapshot.manifestReady && snapshot.serviceWorkerReady) {
    return { badge: "ready", label: "Ready to install", ready: true };
  }

  if (snapshot.manifestReady && snapshot.serviceWorkerReady) {
    return { badge: "available", label: "Install-ready browser", ready: true };
  }

  return { badge: "limited", label: "Install support limited", ready: false };
}

function getInstallMessage(
  status: ReturnType<typeof getInstallStatus>,
  choice: string | undefined,
) {
  if (choice === "dismissed") {
    return "Install was dismissed. You can try again when your browser offers it.";
  }

  if (choice === "accepted") {
    return "Install accepted. Open Essence from your home screen when it appears.";
  }

  if (choice === "unavailable") {
    return "This browser is not exposing a direct install prompt right now.";
  }

  if (status.badge === "installed") {
    return "Essence is running in its installed app window.";
  }

  if (status.badge === "ready") {
    return "This device can add Essence as an app launcher.";
  }

  if (status.badge === "available") {
    return "Use your browser menu to add Essence to your device.";
  }

  return "Use a supported mobile browser to add Essence to your device.";
}
