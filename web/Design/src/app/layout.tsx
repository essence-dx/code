import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { productDescription, productName } from "@/lib/product";
import { AgentCursorProvider } from "@/components/agent-cursor-provider";
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
  title: productName,
  description: productDescription,
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
      className={`${geistSans.variable} ${geistMono.variable} h-full dark`}
    >
      <body
        className="flex min-h-full flex-col overflow-hidden"
        suppressHydrationWarning
      >
        <TooltipProvider>{children}</TooltipProvider>
        <AgentCursorProvider />
      </body>
    </html>
  );
}
