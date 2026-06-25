import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { NativeViewportInsets } from "@/features/system/native-viewport-insets";
import { PwaServiceWorker } from "@/features/system/pwa-service-worker";
import { OfflineStatusBanner } from "@/features/suno/offline-status-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "Music",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Music",
  },
  title: "Music",
  description:
    "A private AI music studio for writing, editing, organizing, and sharing songs.",
  icons: {
    apple: "/icon.svg",
    icon: "/favicon.ico",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  themeColor: "#020617",
  viewportFit: "cover",
  width: "device-width",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-dvh overflow-x-hidden bg-background"
      >
        <NativeViewportInsets />
        <TooltipProvider>
          <OfflineStatusBanner />
          {children}
        </TooltipProvider>
        <PwaServiceWorker />
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
