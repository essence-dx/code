import { Clock3, Heart, Library, WandSparkles } from "lucide-react";
import { formatDuration } from "@/features/audio/format";
import type { LibraryStats } from "@/features/library/types";

type StatStripProps = {
  stats: LibraryStats;
  aiReady: boolean;
};

export function StatStrip({ stats, aiReady }: StatStripProps) {
  const items = [
    {
      label: "Tracks",
      value: stats.totalSongs.toString(),
      icon: Library,
    },
    {
      label: "Liked",
      value: stats.likedSongs.toString(),
      icon: Heart,
    },
    {
      label: "Runtime",
      value: formatDuration(stats.totalDurationMs),
      icon: Clock3,
    },
    {
      label: "Writing",
      value: aiReady ? "ready" : "off",
      icon: WandSparkles,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-white/10 bg-white/[0.035] p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <item.icon className="size-4 text-emerald-200" />
          </div>
          <p className="mt-3 text-2xl font-semibold tracking-normal">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}
