import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/** Enough of the page to reach its <head>; the rest is never read. */
const MAX_BYTES = 512 * 1024;
const TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 3;

export type LinkPreview = {
  url: string;
  host: string;
  title: string | null;
  image: string | null;
  siteName: string | null;
};

/** A fetched page's preview, or null if it can't be reached safely. */
export async function fetchLinkPreview(target: URL): Promise<LinkPreview | null> {
  try {
    const page = await fetchPublicPage(target);
    if (!page) return null;
    const preview = readPreview(page.html, page.url);
    if (preview.title && preview.image) return preview;
    // Some sites give a bot a bare page but publish the same details through
    // oEmbed, their official API for embeds: the endpoint the page names,
    // or YouTube's own.
    const endpoint = oembedEndpoint(page.html, page.url);
    const embed = endpoint ? await fetchOembed(endpoint) : null;
    return embed
      ? {
          ...preview,
          title: preview.title ?? embed.title,
          image: preview.image ?? embed.image,
          siteName: preview.siteName ?? embed.siteName
        }
      : preview;
  } catch {
    return null;
  }
}

function oembedEndpoint(html: string, pageUrl: URL): URL | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (!/application\/json\+oembed/i.test(attribute(tag, "type") ?? "")) continue;
    const href = attribute(tag, "href");
    if (href) return parseTarget(new URL(decodeEntities(href), pageUrl).toString());
  }
  const host = pageUrl.hostname.replace(/^(www|m)\./, "");
  if (host === "youtube.com" || host === "youtu.be") {
    return new URL(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(pageUrl.toString())}`);
  }
  return null;
}

async function fetchOembed(endpoint: URL) {
  if (!(await isPublicHost(endpoint.hostname))) return null;
  const response = await fetch(endpoint, { redirect: "error", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) return null;
  const data = JSON.parse(await readCapped(response)) as Record<string, unknown>;
  const text = (key: string) => (typeof data[key] === "string" && data[key] ? (data[key] as string) : null);
  const thumbnail = text("thumbnail_url");
  return {
    title: text("title"),
    image: thumbnail && /^https?:\/\//i.test(thumbnail) ? thumbnail : null,
    siteName: text("provider_name")
  };
}

export function parseTarget(raw: string | null): URL | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.port && url.port !== "80" && url.port !== "443") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

async function isPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return false;
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  return addresses.length > 0 && addresses.every(({ address }) => !isPrivateAddress(address));
}

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function fetchPublicPage(start: URL): Promise<{ url: URL; html: string } | null> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (!(await isPublicHost(url.hostname))) return null;
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PlannerTogetherBot/1.0; +https://www.planner-together.com)",
        Accept: "text/html,application/xhtml+xml"
      }
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      const next = location ? parseTarget(new URL(location, url).toString()) : null;
      if (!next) return null;
      url = next;
      continue;
    }
    if (!response.ok || !(response.headers.get("content-type") ?? "").includes("html")) return null;
    return { url, html: await readCapped(response) };
  }
  return null;
}

async function readCapped(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size < MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  return new TextDecoder().decode(Buffer.concat(chunks).subarray(0, MAX_BYTES));
}

function readPreview(html: string, pageUrl: URL): LinkPreview {
  const head = html.slice(0, html.search(/<\/head>/i) >= 0 ? html.search(/<\/head>/i) : html.length);
  const meta = (key: string) => {
    for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
      const name = attribute(tag, "property") ?? attribute(tag, "name");
      if (name?.toLowerCase() === key) return decodeEntities(attribute(tag, "content") ?? "").trim() || null;
    }
    return null;
  };
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const rawImage = meta("og:image") ?? meta("og:image:url") ?? meta("twitter:image");
  let image: string | null = null;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, pageUrl);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") image = resolved.toString();
    } catch {
      image = null;
    }
  }
  return {
    url: pageUrl.toString(),
    host: pageUrl.hostname.replace(/^www\./, ""),
    title: meta("og:title") ?? meta("twitter:title") ?? (titleTag ? decodeEntities(titleTag).trim() || null : null),
    image,
    siteName: meta("og:site_name")
  };
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? (match[2] ?? match[3] ?? match[4] ?? "") : null;
}

function decodeEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}
