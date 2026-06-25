import {
  createPage,
  createQrCodeElement,
  createShapeElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignDocument, DesignElement } from "@/features/editor/types";

const canvas = {
  width: 480,
  height: 1280,
};

const links = [
  {
    label: "Shop the latest drop",
    url: "https://example.com/shop",
    fill: "#111827",
    textColor: "#ffffff",
  },
  {
    label: "Book a consultation",
    url: "https://example.com/book",
    fill: "#0f766e",
    textColor: "#ffffff",
  },
  {
    label: "Read the case studies",
    url: "https://example.com/work",
    fill: "#f8fafc",
    textColor: "#111827",
  },
  {
    label: "Join the newsletter",
    url: "https://example.com/newsletter",
    fill: "#facc15",
    textColor: "#111827",
  },
] as const;

export function createLinkInBioWebsiteDocument(): DesignDocument {
  const page = createPage({
    name: "Link hub",
    background: "#f5f3ed",
    format: "website",
    width: canvas.width,
    height: canvas.height,
    websiteSeoTitle: "Link hub",
    websiteSeoDescription:
      "All important links, bookings, offers, and updates in one mobile page.",
    websiteNavLabel: "Links",
    websiteNavGroup: "Profile",
    notes:
      "Replace each placeholder URL in layer properties before publishing this link-in-bio site.",
    elements: createLinkInBioElements(),
  });

  return {
    version: 1,
    width: canvas.width,
    height: canvas.height,
    pages: [page],
    activePageId: page.id,
  };
}

function createLinkInBioElements(): DesignElement[] {
  const elements: DesignElement[] = [
    createShapeElement({
      x: 28,
      y: 28,
      width: 424,
      height: 1224,
      fill: "#ffffff",
      stroke: "#d8d4ca",
      strokeWidth: 1,
      radius: 34,
    }),
    createShapeElement({
      shape: "ellipse",
      x: 176,
      y: 82,
      width: 128,
      height: 128,
      fill: "#0f766e",
      stroke: "#ffffff",
      strokeWidth: 8,
    }),
    createTextElement({
      content: "Studio Name",
      x: 70,
      y: 236,
      width: 340,
      height: 58,
      fontSize: 38,
      fontWeight: 800,
      color: "#111827",
      textAlign: "center",
      lineHeight: 1.08,
    }),
    createTextElement({
      content: "Original designs, links, bookings, and offers in one clean mobile page.",
      x: 74,
      y: 305,
      width: 332,
      height: 74,
      fontSize: 19,
      fontWeight: 500,
      color: "#57534e",
      textAlign: "center",
      lineHeight: 1.25,
    }),
  ];

  links.forEach((link, index) => {
    const y = 430 + index * 112;

    elements.push(
      createShapeElement({
        x: 58,
        y,
        width: 364,
        height: 78,
        fill: link.fill,
        stroke: link.fill === "#f8fafc" ? "#d4d4d8" : "transparent",
        strokeWidth: link.fill === "#f8fafc" ? 1 : 0,
        radius: 24,
        linkUrl: link.url,
      }),
      createTextElement({
        content: link.label,
        x: 84,
        y: y + 22,
        width: 276,
        height: 34,
        fontSize: 22,
        fontWeight: 750,
        color: link.textColor,
        textAlign: "left",
        lineHeight: 1.05,
        linkUrl: link.url,
      }),
      createTextElement({
        content: "Open",
        x: 354,
        y: y + 25,
        width: 48,
        height: 30,
        fontSize: 15,
        fontWeight: 700,
        color: link.textColor,
        textAlign: "right",
        lineHeight: 1.05,
        linkUrl: link.url,
      }),
    );
  });

  elements.push(
    createShapeElement({
      x: 72,
      y: 910,
      width: 336,
      height: 220,
      fill: "#f8fafc",
      stroke: "#d4d4d8",
      strokeWidth: 1,
      radius: 28,
    }),
    createQrCodeElement({
      x: 96,
      y: 940,
      width: 156,
      height: 156,
      qrValue: "https://example.com",
      qrForeground: "#111827",
      qrBackground: "#f8fafc",
      linkUrl: "https://example.com",
    }),
    createTextElement({
      content: "Share this page anywhere",
      x: 270,
      y: 958,
      width: 108,
      height: 72,
      fontSize: 20,
      fontWeight: 800,
      color: "#111827",
      textAlign: "left",
      lineHeight: 1.05,
    }),
    createTextElement({
      content: "Update the QR value to your final public URL after publishing.",
      x: 270,
      y: 1038,
      width: 108,
      height: 58,
      fontSize: 13,
      fontWeight: 500,
      color: "#57534e",
      textAlign: "left",
      lineHeight: 1.22,
    }),
    createTextElement({
      content: "Built with Essence Studio",
      x: 90,
      y: 1182,
      width: 300,
      height: 32,
      fontSize: 15,
      fontWeight: 650,
      color: "#78716c",
      textAlign: "center",
    }),
  );

  return elements;
}
