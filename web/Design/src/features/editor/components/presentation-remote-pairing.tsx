"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PresentationRemoteSessionState } from "@/features/editor/presentation-remote-types";

type PresentationRemotePairingProps = {
  session: PresentationRemoteSessionState | null;
  controlUrl: string;
  status: "starting" | "ready" | "error";
  error: string | null;
  onCopy: () => void;
};

export function PresentationRemotePairing({
  session,
  controlUrl,
  status,
  error,
  onCopy,
}: PresentationRemotePairingProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!controlUrl) {
      setQrCodeUrl(null);
      return;
    }

    let ignore = false;

    QRCode.toDataURL(controlUrl, {
      margin: 1,
      width: 160,
      color: {
        dark: "#18181b",
        light: "#ffffff",
      },
    })
      .then((dataUrl) => {
        if (!ignore) setQrCodeUrl(dataUrl);
      })
      .catch(() => {
        if (!ignore) setQrCodeUrl(null);
      });

    return () => {
      ignore = true;
    };
  }, [controlUrl]);

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Remote Pairing</h2>
        <Badge variant={status === "ready" ? "secondary" : "outline"}>
          {status === "ready" ? "Ready" : status === "starting" ? "Starting" : "Offline"}
        </Badge>
      </div>

      <div className="grid gap-3 rounded-md border border-border bg-background p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Smartphone className="h-4 w-4" />
          Scan or open the control link from your phone.
        </div>

        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt="Presentation remote pairing QR code"
            className="h-40 w-40 rounded-md border border-border bg-white p-2"
          />
        ) : null}

        <div className="flex gap-2">
          <Input readOnly value={controlUrl || "Starting remote session..."} />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onCopy}
            disabled={!controlUrl}
            aria-label="Copy remote control link"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>

        {session ? (
          <p className="text-xs text-muted-foreground">
            Link expires {new Date(session.expiresAt).toLocaleTimeString()}.
          </p>
        ) : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>
    </section>
  );
}
