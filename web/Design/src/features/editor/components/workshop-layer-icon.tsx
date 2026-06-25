import {
  Clock3,
  FileCode2,
  FileText,
  GitBranch,
  ImageIcon,
  Music,
  QrCode,
  Shapes,
  StickyNote,
  Table2,
  Type,
  Video,
} from "lucide-react";

import type { DesignElement } from "@/features/editor/types";

export function WorkshopLayerIcon({ element }: { element: DesignElement }) {
  if (element.type === "text") return <Type className="h-3.5 w-3.5" />;
  if (element.type === "document") return <FileText className="h-3.5 w-3.5" />;
  if (element.type === "sticky-note") {
    return <StickyNote className="h-3.5 w-3.5" />;
  }
  if (element.type === "connector") return <GitBranch className="h-3.5 w-3.5" />;
  if (element.type === "image") return <ImageIcon className="h-3.5 w-3.5" />;
  if (element.type === "video") return <Video className="h-3.5 w-3.5" />;
  if (element.type === "audio") return <Music className="h-3.5 w-3.5" />;
  if (element.type === "pdf") return <FileText className="h-3.5 w-3.5" />;
  if (element.type === "svg") return <FileCode2 className="h-3.5 w-3.5" />;
  if (element.type === "qr") return <QrCode className="h-3.5 w-3.5" />;
  if (element.type === "table") return <Table2 className="h-3.5 w-3.5" />;
  if (element.type === "timer") return <Clock3 className="h-3.5 w-3.5" />;

  return <Shapes className="h-3.5 w-3.5" />;
}
