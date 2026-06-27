import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AgentCursorProvider } from "@/components/agent-cursor-provider";
import { DesktopProofAutopilot } from "@/features/settings/components/desktop-proof-autopilot";
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
  title: "Video",
  description: "Local-first browser and desktop media editor.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full bg-background text-foreground antialiased"
      >
        <TooltipProvider delayDuration={250}>
          <DesktopProofAutopilot />
          <AgentCursorProvider />
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}
