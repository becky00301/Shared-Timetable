"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import type { LatLng } from "@/lib/maps/geocode";
import { cachedPlaces, searchPlaces, type PlaceSuggestion } from "@/lib/maps/place-search";
import { cn } from "@/lib/utils/cn";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

/**
 * The event panel's place field. Typing offers matching places; picking one
 * saves its name and position. Text that isn't picked from the list still
 * saves as typed, on Enter or when the field loses focus.
 */
export function LocationSearchInput({
  value,
  onChange,
  onCommitText,
  onPick,
  disabled,
  placeholder,
  bias,
  pinned
}: {
  value: string;
  onChange: (value: string) => void;
  /** The typed text is final (Enter or blur) without a pick. */
  onCommitText: () => void;
  onPick: (place: PlaceSuggestion) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Where the trip's other pinned places are, to rank nearby results first. */
  bias: LatLng | null;
  /** The saved place has a picked position. */
  pinned: boolean;
}) {
  const t = useT();
  const listId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipCommitRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [active, setActive] = useState(-1);

  // Search only what the person typed, not a value loaded from the event.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const known = cachedPlaces(trimmed, bias);
    if (known) {
      setResults(known);
      setActive(-1);
      setStatus("done");
      return;
    }
    const controller = new AbortController();
    // The previous list stays up until this query's first answer replaces it.
    setStatus("loading");
    const timer = window.setTimeout(() => {
      // Each source shows up as it answers; "loading" stays while one is out.
      searchPlaces(
        trimmed,
        bias,
        (found, pending) => {
          setResults(found);
          setActive((current) => (current < found.length ? current : -1));
          setStatus(pending ? "loading" : "done");
        },
        controller.signal
      ).catch((error) => {
        if (controller.signal.aborted) return;
        console.warn(error);
        setStatus("error");
      });
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // The bias only ranks results; a change in it need not search again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function pick(place: PlaceSuggestion) {
    skipCommitRef.current = true;
    setOpen(false);
    setQuery("");
    onPick(place);
    inputRef.current?.blur();
  }

  const showList = open && query.trim().length >= MIN_CHARS;

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-muted">
      <label htmlFor={inputId}>{t("detail.location")}</label>
      <Input
        ref={inputRef}
        id={inputId}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
          setQuery(event.target.value);
          setOpen(true);
        }}
        onBlur={() => {
          setOpen(false);
          if (skipCommitRef.current) {
            skipCommitRef.current = false;
            return;
          }
          onCommitText();
        }}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing || event.keyCode === 229) return;
          if (event.key === "ArrowDown" && results.length) {
            event.preventDefault();
            setOpen(true);
            setActive((current) => (current + 1) % results.length);
          } else if (event.key === "ArrowUp" && results.length) {
            event.preventDefault();
            setActive((current) => (current <= 0 ? results.length - 1 : current - 1));
          } else if (event.key === "Escape" && showList) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
          } else if (event.key === "Enter") {
            event.preventDefault();
            if (showList && active >= 0 && results[active]) pick(results[active]);
            else event.currentTarget.blur();
          }
        }}
      />

      {showList ? (
        <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
          {status === "loading" && !results.length ? (
            <p className="px-3 py-2.5 text-xs text-muted">{t("place.searching")}</p>
          ) : status === "error" ? (
            <p className="px-3 py-2.5 text-xs text-muted">{t("place.searchFailed")}</p>
          ) : status === "done" && !results.length ? (
            <p className="px-3 py-2.5 text-xs leading-5 text-muted">{t("place.noResults")}</p>
          ) : (
            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
              {results.map((place, index) => (
                <li
                  key={place.id}
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  // Keep focus in the field so its blur doesn't save the
                  // half-typed text before the pick lands.
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => pick(place)}
                  onPointerEnter={() => setActive(index)}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 px-3 py-2",
                    index === active ? "bg-black/[0.05]" : ""
                  )}
                >
                  <MapPin size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{place.name}</span>
                    {place.address ? (
                      <span className="block truncate text-xs text-muted">{place.address}</span>
                    ) : null}
                  </span>
                </li>
              ))}
              {status === "loading" ? (
                <li className="px-3 py-1.5 text-xs text-muted" aria-live="polite">
                  {t("place.searchingMore")}
                </li>
              ) : null}
            </ul>
          )}
          <p className="border-t border-border px-3 py-1 text-[10px] text-muted/80">
            © OpenStreetMap · Wikipedia
          </p>
        </div>
      ) : value.trim() ? (
        <p className="flex items-center gap-1 text-xs leading-5 text-muted">
          <MapPin size={12} className={cn("shrink-0", pinned ? "text-primary" : "")} aria-hidden="true" />
          {pinned ? t("place.pinned") : t("place.notPinned")}
        </p>
      ) : null}
    </div>
  );
}
