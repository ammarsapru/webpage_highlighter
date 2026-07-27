"use client";

import { HIGHLIGHT_COLORS } from "@/lib/colors";

export default function ColorToolbar({
  x,
  y,
  onPick,
}: {
  x: number;
  y: number;
  onPick: (color: string) => void;
}) {
  return (
    <div
      className="fixed z-50 flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/15 bg-white dark:bg-neutral-900 shadow-lg px-2.5 py-1.5"
      style={{ left: x, top: y, transform: "translate(-50%, -110%)" }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.value}
          title={c.name}
          onClick={() => onPick(c.value)}
          className="h-6 w-6 rounded-full ring-1 ring-black/10 hover:scale-110 transition-transform"
          style={{ background: c.value }}
        />
      ))}
    </div>
  );
}
