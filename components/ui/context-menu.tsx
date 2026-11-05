"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

  /** Opens the menu at a point, for a long press on a phone. */
  const openAt = useCallback((x: number, y: number) => setPos({ x, y }), []);

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
            // Kept on screen: a press near a phone's right or bottom edge would
            // otherwise open the menu half outside it.
            style={{
              top: Math.max(8, Math.min(pos.y, window.innerHeight - 8 - items.length * 32 - 8)),
              left: Math.max(8, Math.min(pos.x, window.innerWidth - 8 - 144))
            }}
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

  return { onContextMenu, openAt, menu };
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_TOLERANCE = 8;

/**
 * A finger held still on an element for half a second. Spread the returned
 * handlers on it; `onLongPress` gets the touch point. The lift that ends a
 * long press is swallowed, so it doesn't also land as a tap.
 */
export function useLongPress(onLongPress: (x: number, y: number) => void, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);

  const clear = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => clear, [clear]);

  return {
    onTouchStart(event: React.TouchEvent) {
      fired.current = false;
      clear();
      const touch = event.touches[0];
      if (!enabled || !touch || event.touches.length !== 1) return;
      const point = { x: touch.clientX, y: touch.clientY };
      origin.current = point;
      timer.current = setTimeout(() => {
        timer.current = null;
        fired.current = true;
        onLongPress(point.x, point.y);
      }, LONG_PRESS_MS);
    },
    onTouchMove(event: React.TouchEvent) {
      const touch = event.touches[0];
      if (!touch || !origin.current) return;
      if (Math.hypot(touch.clientX - origin.current.x, touch.clientY - origin.current.y) > LONG_PRESS_TOLERANCE) clear();
    },
    onTouchEnd(event: React.TouchEvent) {
      clear();
      if (fired.current && event.cancelable) event.preventDefault();
    },
    onTouchCancel: clear
  };
}
