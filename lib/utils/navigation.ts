export function getSafeNextPath(value: string | null | undefined, fallback = "/dashboard") {
  if (!value || !value.startsWith("/")) {
    return fallback;
  }

  try {
    const base = new URL("https://planner-together.invalid");
    const target = new URL(value, base);
    if (target.origin !== base.origin) return fallback;

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return fallback;
  }
}
