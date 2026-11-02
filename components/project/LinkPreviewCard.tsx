"use client";

import { useEffect, useState } from "react";
import type { LinkPreview } from "@/lib/link-preview";

export type TextPart = { kind: "text" | "url"; value: string };

/** A piece of text cut into plain runs and web addresses, in order. Trailing
    punctuation that belongs to the sentence stays with the text. */
export function splitUrls(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let rest = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)) {
    const url = match[0].replace(/[),.;:!?\]}>」』”’]+$/u, "");
    const start = match.index ?? 0;
    if (start > rest) parts.push({ kind: "text", value: text.slice(rest, start) });
    parts.push({ kind: "url", value: url });
    rest = start + url.length;
  }
  if (rest < text.length) parts.push({ kind: "text", value: text.slice(rest) });
  return parts;
}

// One request per address for the whole session, shared by every note that
// carries it; a failed lookup is remembered as null so it isn't retried.
const previews = new Map<string, Promise<LinkPreview | null>>();

function loadPreview(url: string) {
  let pending = previews.get(url);
  if (!pending) {
    pending = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? (response.json() as Promise<LinkPreview>) : null))
      .catch(() => null);
    previews.set(url, pending);
  }
  return pending;
}

/** The page preview for an address, null until it has answered. */
function useLinkPreview(url: string) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  useEffect(() => {
    let active = true;
    setPreview(null);
    loadPreview(url).then((result) => {
      if (active) setPreview(result);
    });
    return () => {
      active = false;
    };
  }, [url]);
  return preview;
}

/**
 * A note's only link, shown as the page's own preview: its image, title and
 * site. Renders nothing until the page has answered, and nothing if it
 * offers neither a title nor an image.
 */
export function LinkPreviewCard({ url }: { url: string }) {
  const preview = useLinkPreview(url);
  const [imageFailed, setImageFailed] = useState(false);

  if (!preview || (!preview.title && !preview.image)) return null;
  const showImage = Boolean(preview.image) && !imageFailed;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-lg border border-border bg-background transition hover:bg-black/[0.02]"
    >
      {showImage ? (
        // A plain <img>: the picture lives on the linked site, and routing it
        // through the image optimiser would mean allow-listing every host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.image!}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          className="aspect-[1.91/1] w-full border-b border-border object-cover"
        />
      ) : null}
      <div className="px-2.5 py-2">
        {preview.title ? (
          <p className="line-clamp-2 text-xs font-semibold leading-5 text-foreground">{preview.title}</p>
        ) : null}
        <p className="truncate text-[11px] text-muted">{preview.siteName ?? preview.host}</p>
      </div>
    </a>
  );
}

/** With several links in a note, each gets just its page's title on the
    line beneath it; nothing until the page answers or if it has none. */
export function LinkTitle({ url }: { url: string }) {
  const preview = useLinkPreview(url);
  if (!preview?.title) return null;
  return <span className="block truncate text-[11px] font-medium text-muted">{preview.title}</span>;
}
