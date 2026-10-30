import assert from "node:assert/strict";

// Run after deployment against the user-facing domain, not just a build URL.
const base = new URL(process.argv[2] || "https://www.planner-together.com");
async function read(path) {
  const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  return response.text();
}

const health = JSON.parse(await read("/api/health"));
assert.equal(health.status, "ok", "Production health is degraded");
assert.equal(health.checks.supabase, "reachable", "Production database is unreachable");
const html = await read("/dashboard");
const paths = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)]
  .map((match) => match[1])
  .filter((path) => path.startsWith("/_next/static/")))];
assert(paths.length > 0, "No application JavaScript found");
const chunks = await Promise.all(paths.map(read));
for (const feature of ["update_project_budget", "reorder_project_notes"]) {
  assert(chunks.some((chunk) => chunk.includes(feature)), `${feature} is missing on ${base.origin}`);
  console.log(`PASS ${base.origin}: ${feature} is deployed`);
}
console.log(`PASS ${base.origin}: application and database health`);
