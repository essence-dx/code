import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ElementRenderer } from "@/features/editor/components/element-renderer";
import { getPageDimensions } from "@/features/editor/page-dimensions";
import type { DesignDocument } from "@/features/editor/types";

type PublicDesignViewerProps = {
  document: DesignDocument;
};

export function PublicDesignViewer({ document }: PublicDesignViewerProps) {
  return (
    <div className="space-y-8">
      {document.pages.map((page, index) => {
        const pageSize = getPageDimensions(document, page);

        return (
          <section key={page.id} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold">{page.name}</h2>
                {page.notes ? (
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {page.notes}
                  </p>
                ) : null}
              </div>
              <Badge variant="outline">
                {index + 1} / {document.pages.length}
              </Badge>
            </div>
            <ScrollArea
              className="rounded-lg border border-border bg-muted/30"
              showHorizontalScrollBar
            >
              <div className="p-4">
                <div
                  className="relative mx-auto overflow-hidden shadow-sm"
                  style={{
                    width: pageSize.width,
                    height: pageSize.height,
                    background: page.background,
                  }}
                >
                  <div
                    className="relative"
                    style={{
                      width: pageSize.width,
                      height: pageSize.height,
                    }}
                  >
                    {page.elements.map((element) =>
                      element.hidden ? null : (
                        <div
                          key={element.id}
                          className="absolute"
                          style={{
                            left: element.x,
                            top: element.y,
                            width: element.width,
                            height: element.height,
                            transform: `rotate(${element.rotation}deg)`,
                            transformOrigin: "center",
                          }}
                        >
                          <ElementRenderer
                            element={element}
                            pageElements={page.elements}
                          />
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
            {index < document.pages.length - 1 ? <Separator /> : null}
          </section>
        );
      })}
    </div>
  );
}
