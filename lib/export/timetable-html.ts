/**
 * Builds the standalone HTML export. Kept apart from the route so the
 * escaping can be exercised directly — it is the part that matters, and the
 * route around it needs a database and a session to run at all.
 */
export type Locale = "ko" | "en";

export const LABELS = {
  ko: {
    allDay: "종일",
    location: "장소",
    notes: "메모",
    emptyDay: "일정이 없어요",
    empty: "아직 일정이 없습니다.",
    exportedAt: "내보낸 날짜",
    weekdays: ["일", "월", "화", "수", "목", "금", "토"],
    errNoProjectId: "projectId가 필요합니다.",
    errNoServerConfig: "서버 설정이 없습니다.",
    errNeedLogin: "로그인이 필요합니다.",
    errNotFound: "시간표를 찾을 수 없습니다."
  },
  en: {
    allDay: "All day",
    location: "Where",
    notes: "Notes",
    emptyDay: "Nothing planned",
    empty: "No schedule yet.",
    exportedAt: "Exported",
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    errNoProjectId: "projectId is required.",
    errNoServerConfig: "The server is not configured.",
    errNeedLogin: "You need to be signed in.",
    errNotFound: "Timetable not found."
  }
} as const;

export type Labels = (typeof LABELS)[Locale];

export function resolveLocale(value: string | null): Locale {
  return value === "en" ? "en" : "ko";
}

/**
 * Everything below is written into a file someone will open in a browser, and
 * all of it came from people typing into the app. Escaping is not optional:
 * a schedule titled with a script tag must read as that text, not run.
 */
export function esc(value: string | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Colours reach the stylesheet, so anything that is not a plain hex is
    dropped rather than escaped — there is no safe way to quote CSS. */
export function safeColor(value: string | null | undefined, fallback = "#D8DCE2") {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}

export type Day = { id: string; date: string; sort_order: number };
export type Item = {
  day_id: string;
  end_day_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
};

function formatDate(date: string, labels: Labels) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekday = labels.weekdays[parsed.getDay()] ?? "";
  return `${date} (${weekday})`;
}

function renderItem(item: Item, labels: Labels) {
  const time = item.all_day
    ? esc(labels.allDay)
    : `${esc(item.start_time.slice(0, 5))} – ${esc(item.end_time.slice(0, 5))}`;
  const location = item.location
    ? `<p class="meta">${esc(labels.location)} · ${esc(item.location)}</p>`
    : "";
  const memo = item.description ? `<p class="memo">${esc(item.description)}</p>` : "";
  return `          <li class="item" style="border-left-color:${safeColor(item.color)}">
            <p class="time">${time}</p>
            <div>
              <p class="title">${esc(item.title)}</p>
              ${location}
              ${memo}
            </div>
          </li>`;
}

export function renderDocument(
  title: string,
  days: Day[],
  items: Item[],
  notes: string[],
  labels: Labels,
  locale: Locale
) {
  const byDay = new Map<string, Item[]>();
  for (const item of items) {
    const list = byDay.get(item.day_id) ?? [];
    list.push(item);
    byDay.set(item.day_id, list);
  }

  const sortedDays = [...days].sort(
    (a, b) => a.sort_order - b.sort_order || a.date.localeCompare(b.date)
  );

  const sections = sortedDays
    .map((day) => {
      const dayItems = (byDay.get(day.id) ?? []).sort(
        (a, b) =>
          Number(b.all_day) - Number(a.all_day) || a.start_time.localeCompare(b.start_time)
      );
      const body = dayItems.length
        ? `<ul class="items">\n${dayItems.map((item) => renderItem(item, labels)).join("\n")}\n          </ul>`
        : `<p class="empty">${esc(labels.emptyDay)}</p>`;
      return `      <section class="day">
        <h2>${esc(formatDate(day.date, labels))}</h2>
        ${body}
      </section>`;
    })
    .join("\n");

  const noteBlock = notes.length
    ? `      <section class="notes">
        <h2>${esc(labels.notes)}</h2>
        <ul>
${notes.map((note) => `          <li>${esc(note)}</li>`).join("\n")}
        </ul>
      </section>`
    : "";

  const exported = new Date().toISOString().slice(0, 10);

  // Self-contained on purpose: no fonts, scripts or images to fetch, so the
  // file still reads years from now on a machine that has never heard of us.
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 40px 20px; background: #fff; color: #2d333e;
    font: 15px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo",
      "Malgun Gothic", Roboto, sans-serif;
  }
  main { max-width: 760px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 28px; letter-spacing: -0.02em; }
  .exported { margin: 0 0 36px; color: #69707f; font-size: 13px; }
  .day { margin-bottom: 28px; }
  .day h2 {
    margin: 0 0 12px; padding-bottom: 8px; font-size: 15px; font-weight: 600;
    border-bottom: 1px solid #e1e3e7;
  }
  .items { margin: 0; padding: 0; list-style: none; }
  .item {
    display: flex; gap: 16px; padding: 10px 0 10px 14px; margin-bottom: 8px;
    border-left: 4px solid #d8dce2; border-radius: 2px;
  }
  .time {
    flex: 0 0 104px; margin: 0; color: #69707f; font-size: 13px;
    font-variant-numeric: tabular-nums;
  }
  .title { margin: 0; font-weight: 600; }
  .meta { margin: 2px 0 0; color: #69707f; font-size: 13px; }
  .memo { margin: 6px 0 0; color: #59616f; font-size: 13px; white-space: pre-wrap; }
  .empty { margin: 0; color: #8a919e; font-size: 13px; }
  .notes { margin-top: 40px; padding-top: 24px; border-top: 1px solid #e1e3e7; }
  .notes h2 { margin: 0 0 12px; font-size: 15px; font-weight: 600; }
  .notes ul { margin: 0; padding-left: 18px; }
  .notes li { margin-bottom: 6px; white-space: pre-wrap; }
  @media print {
    body { padding: 0; }
    .day { break-inside: avoid; }
  }
</style>
</head>
<body>
  <main>
    <h1>${esc(title)}</h1>
    <p class="exported">${esc(labels.exportedAt)} ${esc(exported)}</p>
${sections || `    <p class="empty">${esc(labels.empty)}</p>`}
${noteBlock}
  </main>
</body>
</html>
`;
}

