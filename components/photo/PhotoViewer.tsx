"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/locale";

const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
/** A press that travels less than this is a tap or click, not a drag. */
const TAP_SLOP = 8;
/** How far a downward swipe at normal size must go to close the viewer. */
const SWIPE_CLOSE_DISTANCE = 110;

type View = { scale: number; x: number; y: number };
type Point = { x: number; y: number };

/**
 * A schedule photo shown whole, on a dark backdrop, to read it again later —
 * a ticket, say. Pinch or double-tap to zoom and drag to look around on a
 * phone; wheel or click on a computer. X, Esc, a tap on the backdrop or a
 * swipe down closes it.
 */
export function PhotoViewer({
  url,
  title,
  subtitle,
  onClose
}: {
  url: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const t = useT();
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  viewRef.current = view;
  // Distance of an in-progress swipe-down at normal size, for the fade.
  const [swipe, setSwipe] = useState(0);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => setMounted(true), []);

  // Whatever had focus when the viewer opened gets it back on close.
  const opener = useRef<HTMLElement | null>(null);
  useLayoutEffect(() => {
    opener.current = document.activeElement as HTMLElement | null;
  }, []);

  // The close button takes focus once the portal is on the page.
  useEffect(() => {
    if (mounted) closeRef.current?.focus();
  }, [mounted]);

  // Keyboard: Esc closes, Tab stays on the close button, and no other key
  // reaches the page underneath (Delete there would remove the event).
  useEffect(() => {
    const previous = opener;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      event.stopImmediatePropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Tab") {
        event.preventDefault();
        closeRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = overflow;
      previous.current?.focus?.();
    };
  }, [onClose]);

  /** Keeps the zoomed photo from sliding off: it may move only as far as it
      overhangs the stage. */
  const clamp = useCallback((next: View): View => {
    const stage = stageRef.current;
    const image = imageRef.current;
    const scale = Math.max(1, Math.min(MAX_SCALE, next.scale));
    if (!stage || !image || scale === 1) return { scale, x: 0, y: 0 };
    const maxX = Math.max(0, (image.offsetWidth * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (image.offsetHeight * scale - stage.clientHeight) / 2);
    return {
      scale,
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y))
    };
  }, []);

  /** Zooms to `scale` keeping the photo point under `at` (relative to the
      stage's centre) where it is. */
  const zoomAt = useCallback(
    (scale: number, at: Point, from: View = viewRef.current) => {
      const ratio = Math.max(1, Math.min(MAX_SCALE, scale)) / from.scale;
      setView(clamp({ scale: from.scale * ratio, x: at.x - (at.x - from.x) * ratio, y: at.y - (at.y - from.y) * ratio }));
    },
    [clamp]
  );

  function fromCentre(clientX: number, clientY: number): Point {
    const box = stageRef.current!.getBoundingClientRect();
    return { x: clientX - box.left - box.width / 2, y: clientY - box.top - box.height / 2 };
  }

  function toggleZoom(at: Point) {
    if (viewRef.current.scale > 1) setView({ scale: 1, x: 0, y: 0 });
    else zoomAt(DOUBLE_TAP_SCALE, at);
  }

  // Pointer gestures: one pointer pans (or swipes down at normal size), two
  // pinch. Kept in refs so moves don't wait for a render.
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    start: Point;
    view: View;
    moved: boolean;
    onImage: boolean;
    pinch?: { distance: number; mid: Point; view: View };
  } | null>(null);
  const lastTap = useRef<{ time: number; point: Point } | null>(null);

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer the browser no longer tracks: the gesture still works
      // while it stays over the photo.
    }
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const onImage = event.target === imageRef.current;
    if (pointers.current.size === 1) {
      gesture.current = { start: { x: event.clientX, y: event.clientY }, view: viewRef.current, moved: false, onImage };
    } else if (pointers.current.size === 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      gesture.current.moved = true;
      gesture.current.pinch = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        mid: fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2),
        view: viewRef.current
      };
      setSwipe(0);
    }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const current = gesture.current;

    if (current.pinch && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = fromCentre((a.x + b.x) / 2, (a.y + b.y) / 2);
      const { view: base } = current.pinch;
      const scale = Math.max(1, Math.min(MAX_SCALE, base.scale * (distance / current.pinch.distance)));
      const ratio = scale / base.scale;
      // The photo point under the first midpoint follows the fingers.
      setView(
        clamp({
          scale,
          x: mid.x - (current.pinch.mid.x - base.x) * ratio,
          y: mid.y - (current.pinch.mid.y - base.y) * ratio
        })
      );
      return;
    }

    const dx = event.clientX - current.start.x;
    const dy = event.clientY - current.start.y;
    if (!current.moved && Math.hypot(dx, dy) > TAP_SLOP) current.moved = true;
    if (!current.moved) return;
    if (current.view.scale > 1) {
      setView(clamp({ scale: current.view.scale, x: current.view.x + dx, y: current.view.y + dy }));
    } else if (event.pointerType !== "mouse") {
      setSwipe(Math.max(0, dy));
    }
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    const current = gesture.current;
    if (!current) return;
    if (pointers.current.size > 0) {
      // One finger of a pinch lifted: carry on panning with the other.
      const [rest] = [...pointers.current.values()];
      gesture.current = { start: rest, view: viewRef.current, moved: true, onImage: current.onImage };
      return;
    }
    gesture.current = null;

    if (swipe > 0) {
      if (swipe > SWIPE_CLOSE_DISTANCE) onClose();
      setSwipe(0);
      return;
    }
    if (current.moved || event.type === "pointercancel") return;

    // A tap or click.
    const point = fromCentre(event.clientX, event.clientY);
    if (event.pointerType === "mouse") {
      if (current.onImage) toggleZoom(point);
      else onClose();
      return;
    }
    const now = Date.now();
    const previous = lastTap.current;
    if (previous && now - previous.time < DOUBLE_TAP_MS && Math.hypot(point.x - previous.point.x, point.y - previous.point.y) < 40) {
      lastTap.current = null;
      toggleZoom(point);
      return;
    }
    lastTap.current = { time: now, point };
    if (!current.onImage && viewRef.current.scale === 1) onClose();
  }

  function onWheel(event: React.WheelEvent<HTMLDivElement>) {
    const factor = Math.exp(-event.deltaY * 0.0025);
    zoomAt(viewRef.current.scale * factor, fromCentre(event.clientX, event.clientY));
  }

  if (!mounted) return null;

  const fade = Math.min(1, swipe / (SWIPE_CLOSE_DISTANCE * 2));

  return createPortal(
    <div
      data-photo-viewer
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[100] flex flex-col text-white"
      style={{ backgroundColor: `rgba(10, 12, 16, ${1 - fade})` }}
    >
      <div className="relative z-10 flex items-start gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1" style={{ opacity: 1 - fade }}>
          <p className="truncate text-sm font-semibold">{title}</p>
          {subtitle ? <p className="mt-0.5 truncate text-xs text-white/70">{subtitle}</p> : null}
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="-mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
        >
          <X size={20} />
        </button>
      </div>
      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Storage URL, shown whole */}
        <img
          ref={imageRef}
          src={url}
          alt={title}
          draggable={false}
          className="max-h-full max-w-full object-contain will-change-transform"
          style={{
            transform: `translate(${view.x}px, ${view.y + swipe}px) scale(${view.scale})`,
            transition: gesture.current ? "none" : "transform 160ms ease-out",
            cursor: view.scale > 1 ? "zoom-out" : "zoom-in"
          }}
        />
      </div>
    </div>,
    document.body
  );
}
