// Run against a running build or deployment, without executing browser JS:
// node scripts/check-sharing-metadata.mjs http://127.0.0.1:3137
import assert from "node:assert/strict";

const base = new URL(process.argv[2] ?? "https://www.planner-together.com");
const expectedImage = "https://www.planner-together.com/og/planner-together-v1.png";
const cases = [
  { path: "/", userAgent: "kakaotalk-scrap/1.0", privatePage: false },
  { path: "/dashboard", userAgent: "kakaotalk-scrap/1.0", privatePage: true },
  { path: "/", userAgent: "facebookexternalhit/1.1", privatePage: false },
  { path: "/", userAgent: "Twitterbot/1.0", privatePage: false }
];

await Promise.all(cases.map(async ({ path, userAgent, privatePage }) => {
  const response = await fetch(new URL(path, base), {
    headers: { "User-Agent": userAgent },
    signal: AbortSignal.timeout(30_000)
  });
  assert.equal(response.status, 200, `${path} must be publicly accessible`);
  const html = await response.text();
  const head = html.match(/<head\b[^>]*>([\s\S]*?)<\/head>/i)?.[1];
  assert.ok(head, `${path} must have a complete head`);
  const metadata = new Map();
  for (const tag of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = Object.fromEntries(
      [...tag[0].matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]])
    );
    metadata.set(attributes.property ?? attributes.name, attributes.content);
  }
  const label = `${path} (${userAgent})`;
  // Finding tags elsewhere in the document is insufficient for Kakao.
  assert.equal(metadata.get("og:image"), expectedImage, `${label}: image must be in head`);
  assert.ok(metadata.get("og:title"), `${label}: title must be in head`);
  assert.ok(metadata.get("og:description"), `${label}: description must be in head`);
  assert.equal(metadata.get("og:image:width"), "1200", label);
  assert.equal(metadata.get("og:image:height"), "630", label);
  assert.equal(metadata.get("twitter:card"), "summary_large_image", label);
  assert.equal(metadata.get("twitter:image"), expectedImage, label);
  assert.equal(/\bnoindex\b/.test(metadata.get("robots") ?? ""), privatePage, label);
  console.log(`PASS ${label}: sharing metadata is in head`);
}));

const imageResponse = await fetch(new URL(new URL(expectedImage).pathname, base), {
  signal: AbortSignal.timeout(30_000)
});
assert.equal(imageResponse.status, 200);
assert.match(imageResponse.headers.get("content-type") ?? "", /^image\/png\b/);
const image = Buffer.from(await imageResponse.arrayBuffer());
assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
console.log(`PASS public PNG: 1200x630, ${image.length} bytes`);
