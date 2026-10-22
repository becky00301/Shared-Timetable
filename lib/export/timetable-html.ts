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

/** Pixels per hour in the exported sheet. Small enough that a few days fit a
    printed page, large enough that a 30-minute item still shows its title. */
const HOUR_PX = 44;
const MIN_BLOCK_PX = 18;
const FALLBACK_WINDOW: [number, number] = [9 * 60, 18 * 60];

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const pad2 = (n: number) => String(n).padStart(2, "0");

function formatDate(date: string, labels: Labels) {
  const parsed = new Date(`${date}T00:00:00`);
  return { date, weekday: labels.weekdays[parsed.getDay()] ?? "" };
}

/**
 * The window of hours the sheet covers. Exporting all 24 would be mostly
 * blank, so it runs from the hour before the first item to the hour after the
 * last, and falls back to a working day when there is nothing timed.
 */
function hourWindow(items: Item[]): [number, number] {
  const timed = items.filter((item) => !item.all_day);
  if (!timed.length) return FALLBACK_WINDOW;
  const earliest = Math.min(...timed.map((item) => toMinutes(item.start_time)));
  const latest = Math.max(...timed.map((item) => toMinutes(item.end_time)));
  const start = Math.max(0, Math.floor(earliest / 60) * 60);
  const end = Math.min(24 * 60, Math.ceil(latest / 60) * 60);
  return end - start < 60 ? [start, Math.min(24 * 60, start + 60)] : [start, end];
}

/** Overlapping items share the column rather than hiding each other, the way
    they do in the app. */
function packLanes(items: Item[]) {
  const sorted = [...items].sort(
    (a, b) => toMinutes(a.start_time) - toMinutes(b.start_time) || a.title.localeCompare(b.title)
  );
  const laneEnds: number[] = [];
  const placed = sorted.map((item) => {
    const start = toMinutes(item.start_time);
    const end = toMinutes(item.end_time);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { item, lane };
  });
  return { placed, laneCount: Math.max(1, laneEnds.length) };
}

function renderBlock(item: Item, lane: number, laneCount: number, windowStart: number) {
  const start = toMinutes(item.start_time);
  const end = toMinutes(item.end_time);
  const top = ((start - windowStart) / 60) * HOUR_PX;
  const height = Math.max(((end - start) / 60) * HOUR_PX, MIN_BLOCK_PX);
  const width = 100 / laneCount;
  const fill = safeColor(item.color);
  const ink = readableInk(fill);
  const time = `${esc(item.start_time.slice(0, 5))}–${esc(item.end_time.slice(0, 5))}`;
  const where = item.location ? `<span class="where">${esc(item.location)}</span>` : "";
  return `<div class="block" style="top:${top}px;height:${height}px;left:${lane * width}%;width:${width}%;background:${fill};color:${ink}" title="${esc(item.title)}">
            <span class="btitle">${esc(item.title)}</span>
            <span class="btime">${time}</span>
            ${where}
          </div>`;
}

/** Same rule the app uses on a schedule block: dark text on a light colour,
    white on a dark one. */
function readableInk(hex: string) {
  const n = hex.replace("#", "");
  const channels = [0, 2, 4].map((o) => Number.parseInt(n.slice(o, o + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? "#111827" : "#FFFFFF";
}

export function renderDocument(
  title: string,
  days: Day[],
  items: Item[],
  notes: string[],
  labels: Labels,
  locale: Locale
) {
  const sortedDays = [...days].sort(
    (a, b) => a.sort_order - b.sort_order || a.date.localeCompare(b.date)
  );
  const dayIndex = new Map(sortedDays.map((day, i) => [day.id, i]));

  const timedByDay = new Map<string, Item[]>();
  for (const item of items) {
    if (item.all_day) continue;
    const list = timedByDay.get(item.day_id) ?? [];
    list.push(item);
    timedByDay.set(item.day_id, list);
  }

  // An all-day item shows on every day it covers, not only where it starts.
  const allDayByDay = new Map<string, Item[]>();
  for (const item of items) {
    if (!item.all_day) continue;
    const from = dayIndex.get(item.day_id);
    if (from === undefined) continue;
    const to = item.end_day_id ? dayIndex.get(item.end_day_id) ?? from : from;
    for (let i = Math.min(from, to); i <= Math.max(from, to); i++) {
      const day = sortedDays[i];
      if (!day) continue;
      const list = allDayByDay.get(day.id) ?? [];
      list.push(item);
      allDayByDay.set(day.id, list);
    }
  }

  const [windowStart, windowEnd] = hourWindow(items);
  const hours: number[] = [];
  for (let m = windowStart; m < windowEnd; m += 60) hours.push(m);
  const bodyHeight = hours.length * HOUR_PX;
  const hasAllDay = allDayByDay.size > 0;

  const headCells = sortedDays
    .map((day) => {
      const { date, weekday } = formatDate(day.date, labels);
      return `<div class="dayhead"><span class="d">${esc(date)}</span><span class="w">${esc(weekday)}</span></div>`;
    })
    .join("");

  const allDayCells = sortedDays
    .map((day) => {
      const chips = (allDayByDay.get(day.id) ?? [])
        .map((item) => {
          const fill = safeColor(item.color);
          return `<span class="chip" style="background:${fill};color:${readableInk(fill)}">${esc(item.title)}</span>`;
        })
        .join("");
      return `<div class="allday">${chips}</div>`;
    })
    .join("");

  const gutter = hours
    .map((m) => `<div class="hour"><span>${pad2(Math.floor(m / 60))}:${pad2(m % 60)}</span></div>`)
    .join("");

  const bodyCells = sortedDays
    .map((day) => {
      const { placed, laneCount } = packLanes(timedByDay.get(day.id) ?? []);
      const blocks = placed
        .map(({ item, lane }) => renderBlock(item, lane, laneCount, windowStart))
        .join("");
      return `<div class="col">${blocks}</div>`;
    })
    .join("");

  const noteBlock = notes.length
    ? `    <section class="notes">
      <h2>${esc(labels.notes)}</h2>
      <ul>
${notes.map((note) => `        <li>${esc(note)}</li>`).join("\n")}
      </ul>
    </section>`
    : "";

  const sheet = sortedDays.length
    ? `    <div class="sheet" style="--days:${sortedDays.length};--hour:${HOUR_PX}px;--body:${bodyHeight}px">
      <div class="corner"></div>
      ${headCells}
      ${hasAllDay ? `<div class="alldaylabel">${esc(labels.allDay)}</div>${allDayCells}` : ""}
      <div class="gutter">${gutter}</div>
      ${bodyCells}
    </div>`
    : `    <p class="empty">${esc(labels.empty)}</p>`;

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
    margin: 0; padding: 32px 20px; background: #fff; color: #2d333e;
    font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", "Apple SD Gothic Neo",
      "Malgun Gothic", Roboto, sans-serif;
  }
  main { max-width: 1100px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.02em; }
  .exported { margin: 0 0 24px; color: #69707f; font-size: 13px; }

  .sheet {
    display: grid;
    grid-template-columns: 52px repeat(var(--days), minmax(104px, 1fr));
    border: 1px solid #e1e3e7; border-radius: 12px; overflow: hidden;
  }
  .corner, .alldaylabel { background: #f7f8f9; border-right: 1px solid #e1e3e7; }
  .corner { border-bottom: 1px solid #e1e3e7; }
  .dayhead {
    background: #f7f8f9; border-bottom: 1px solid #e1e3e7; border-right: 1px solid #e1e3e7;
    padding: 8px 6px; text-align: center;
  }
  .dayhead:last-child, .allday:last-child, .col:last-child { border-right: 0; }
  .dayhead .d { display: block; font-size: 12px; font-weight: 600; }
  .dayhead .w { display: block; margin-top: 2px; font-size: 11px; color: #69707f; }

  .alldaylabel {
    display: flex; align-items: center; justify-content: flex-end;
    padding: 0 6px; font-size: 11px; color: #69707f;
    border-bottom: 1px solid #e1e3e7;
  }
  .allday {
    border-bottom: 1px solid #e1e3e7; border-right: 1px solid #e1e3e7;
    padding: 4px; display: flex; flex-direction: column; gap: 3px; min-height: 26px;
  }
  .chip {
    border-radius: 4px; padding: 2px 5px; font-size: 10px; font-weight: 600;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .gutter { border-right: 1px solid #e1e3e7; height: var(--body); }
  .hour { height: var(--hour); position: relative; }
  .hour span {
    position: absolute; top: -6px; right: 6px;
    font-size: 10px; color: #8a919e; font-variant-numeric: tabular-nums;
  }
  .hour:first-child span { top: 2px; }

  .col {
    position: relative; height: var(--body); border-right: 1px solid #e1e3e7;
    background-image: repeating-linear-gradient(
      to bottom, #eef0f3 0, #eef0f3 1px, transparent 1px, transparent var(--hour)
    );
  }
  .block {
    position: absolute; overflow: hidden; border-radius: 4px;
    padding: 3px 5px; display: flex; flex-direction: column; gap: 1px;
  }
  .btitle { font-size: 11px; font-weight: 600; line-height: 1.25; }
  .btime, .where {
    font-size: 10px; line-height: 1.25; opacity: 0.85;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  .empty { color: #8a919e; font-size: 13px; }
  .notes { margin-top: 32px; padding-top: 20px; border-top: 1px solid #e1e3e7; }
  .notes h2 { margin: 0 0 10px; font-size: 14px; font-weight: 600; }
  .notes ul { margin: 0; padding-left: 18px; }
  .notes li { margin-bottom: 6px; white-space: pre-wrap; }

  @media print {
    body { padding: 0; }
    .sheet, .notes { break-inside: avoid; }
  }
</style>
</head>
<body>
  <main>
    <h1>${esc(title)}</h1>
    <p class="exported">${esc(labels.exportedAt)} ${esc(exported)}</p>
${sheet}
${noteBlock}
  </main>
</body>
</html>
`;
}
