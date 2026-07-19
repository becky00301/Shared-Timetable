"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

export type ContextMenuItem = {
  label: string;
  onSelect: () => void;
  danger?: boolean;
};

// Native-feeling right-click menu. Spread `onContextMenu` on the target and
// render `menu` somewhere in the tree.
export function useContextMenu(items: ContextMenuItem[]) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setPos({ x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPos(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [pos]);

  const menu =
    pos && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed z-[100] min-w-36 overflow-hidden rounded-lg border border-border bg-background py-1 shadow-glow"
            style={{ top: pos.y, left: pos.x }}
            onClick={(event) => event.stopPropagation()}
            onContextMenu={(event) => event.preventDefault()}
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setPos(null);
                  item.onSelect();
                }}
                className={cn(
                  "block w-full px-3 py-1.5 text-left text-sm transition hover:bg-black/6",
                  item.danger ? "text-red-600" : "text-foreground"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )
      : null;

  return { onContextMenu, menu };
}
