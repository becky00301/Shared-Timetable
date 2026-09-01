"use client";

import { useEffect, useRef, type RefObject } from "react";
import { useT } from "@/lib/i18n/locale";
import { MAX_CURSOR_CHAT } from "@/lib/supabase/cursors";

/**
 * The Figma-style chat line: it hangs off your own pointer and everything you
 * type is already on everyone else's screen — there is no send.
 *
 * The field follows the pointer by writing a transform straight to the DOM
 * rather than through React state, so moving the mouse while typing costs a
 * compositor transform rather than a re-render of the whole grid.
 */
export function CursorChatInput({
  positionRef,
  boxRef,
  color,
  value,
  onChange,
  onClose
}: {
  positionRef: RefObject<{ x: number; y: number } | null>;
  boxRef: RefObject<HTMLElement | null>;
  color: string;
  value: string;
  onChange: (next: string) => void;
  onClose: () => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const t = useT();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const place = () => {
      const wrap = wrapRef.current;
      const box = boxRef.current;
      const point = positionRef.current;
      if (!wrap || !box || !point) return;
      wrap.style.transform = `translate3d(${point.x * box.clientWidth}px, ${
        point.y * box.clientHeight
      }px, 0)`;
    };
    place();
    // Driven by the pointer rather than by a frame loop: the position only
    // changes when the mouse does, so a loop would burn frames for the whole
    // time the chat is open. useLiveCursors registers its own pointermove
    // listener when the grid mounts, which is earlier than this one, and
    // listeners fire in registration order — so positionRef is already fresh.
    window.addEventListener("pointermove", place);
    return () => window.removeEventListener("pointermove", place);
  }, [positionRef, boxRef]);

  return (
    // pointer-events-none throughout: the field sits directly under the pointer,
    // so anything clickable here would swallow drags meant for the grid. Keyboard
    // focus is unaffected by it, which is all this needs.
    <div ref={wrapRef} className="pointer-events-none absolute left-0 top-0 will-change-transform">
      <div
        className="ml-[22px] mt-1 flex w-[220px] items-center rounded-lg border bg-surface px-2 py-1 shadow-md"
        style={{ borderColor: color }}
      >
        <input
          ref={inputRef}
          value={value}
          maxLength={MAX_CURSOR_CHAT}
          placeholder={t("cursorChat.placeholder")}
          className="pointer-events-none w-full bg-transparent text-[11px] leading-4 text-foreground outline-none placeholder:text-muted"
          onChange={(event) => onChange(event.target.value)}
          onBlur={onClose}
          onKeyDown={(event) => {
            // Hangul commits a syllable with Enter, so a bare Enter here would
            // close the chat mid-word.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Enter" || event.key === "Escape") {
              event.preventDefault();
              onClose();
            }
          }}
        />
      </div>
    </div>
  );
}
