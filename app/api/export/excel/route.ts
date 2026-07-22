import { NextResponse } from "next/server";
import writeXlsxFile, { getSheetData, type CellObject, type Column, type SheetData } from "write-excel-file/node";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

type Row = {
  date: string;
  weekday: string;
  kind: string;
  start: string;
  end: string;
  title: string;
  location: string;
  memo: string;
};

type NoteRow = { body: string; createdAt: string };

type ExportDay = {
  id: string;
  date: string;
  sort_order: number | null;
};

type ExportItem = {
  day_id: string;
  end_day_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  start_time: string;
  end_time: string;
  all_day?: boolean | null;
  color?: string | null;
};

type VisualSheet = {
  data: SheetData;
  columns: { width: number }[];
};

function textColumn<T>(header: string, width: number, pick: (row: T) => string): Column<T> {
  return {
    header: { value: header, fontWeight: "bold", backgroundColor: "#F0EFEC", align: "center" },
    cell: (row) => ({ value: pick(row), type: String, wrap: true }),
    width
  };
}

const scheduleColumns: Column<Row>[] = [
  textColumn("날짜", 14, (row) => row.date),
  textColumn("요일", 6, (row) => row.weekday),
  textColumn("구분", 8, (row) => row.kind),
  textColumn("시작", 8, (row) => row.start),
  textColumn("종료", 8, (row) => row.end),
  textColumn("일정", 28, (row) => row.title),
  textColumn("장소", 22, (row) => row.location),
  textColumn("메모", 40, (row) => row.memo)
];

const noteColumns: Column<NoteRow>[] = [
  textColumn("메모", 60, (row) => row.body),
  textColumn("작성일", 14, (row) => row.createdAt)
];

const HALF_HOUR = 30;
const DEFAULT_START_MINUTES = 9 * 60;
const DEFAULT_END_MINUTES = 18 * 60;
const VISUAL_COLORS = ["#BFDBFE", "#DDD6FE", "#BBF7D0", "#FED7AA", "#FDE68A", "#FBCFE8", "#BAE6FD"];

function toMinutes(time: string) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function toTime(minutes: number) {
  const clamped = Math.max(0, Math.min(24 * 60, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, "0")}:${String(clamped % 60).padStart(2, "0")}`;
}

function floorToHalfHour(minutes: number) {
  return Math.floor(minutes / HALF_HOUR) * HALF_HOUR;
}

function ceilToHalfHour(minutes: number) {
  return Math.ceil(minutes / HALF_HOUR) * HALF_HOUR;
}

function formatKoreanDate(date: string) {
  const value = new Date(`${date}T00:00:00`);
  return `${value.getMonth() + 1}월 ${value.getDate()}일\n${WEEKDAY_KO[value.getDay()] ?? ""}`;
}

function normalizeHex(color: string | null | undefined) {
  return color && /^#[0-9a-fA-F]{6}$/.test(color) ? color.toUpperCase() : null;
}

function softenColor(color: string | null | undefined, fallbackIndex: number) {
  const normalized = normalizeHex(color);
  if (!normalized) return VISUAL_COLORS[fallbackIndex % VISUAL_COLORS.length];

  const channel = (start: number) => {
    const value = parseInt(normalized.slice(start, start + 2), 16);
    return Math.round(value + (255 - value) * 0.55);
  };

  return `#${[channel(1), channel(3), channel(5)]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function cell(value: string, style: Omit<CellObject, "value" | "type"> = {}): CellObject {
  return {
    value,
    type: String,
    fontFamily: "Arial",
    fontSize: 10,
    align: "center",
    alignVertical: "center",
    wrap: true,
    ...style
  };
}

function spanCell(value: string, columnSpan: number, style: Omit<CellObject, "value" | "type" | "columnSpan"> = {}) {
  return cell(value, { columnSpan, ...style });
}

function createEmptyRow(columnCount: number, height = 18): SheetData[number] {
  return Array.from({ length: columnCount }, () =>
    cell("", {
      height,
      backgroundColor: "#FFFFFF",
      borderColor: "#D9D9D9",
      borderStyle: "thin"
    })
  );
}

function packTimedItems(items: ExportItem[]) {
  const lanes: number[] = [];
  return items
    .slice()
    .sort(
      (a, b) =>
        floorToHalfHour(toMinutes(a.start_time)) - floorToHalfHour(toMinutes(b.start_time)) ||
        ceilToHalfHour(toMinutes(a.end_time)) - ceilToHalfHour(toMinutes(b.end_time))
    )
    .map((item) => {
      const visualStart = floorToHalfHour(toMinutes(item.start_time));
      const visualEnd = Math.max(visualStart + HALF_HOUR, ceilToHalfHour(toMinutes(item.end_time)));
      let lane = lanes.findIndex((laneEnd) => laneEnd <= visualStart);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(visualEnd);
      } else {
        lanes[lane] = visualEnd;
      }
      return { item, lane, start: visualStart, end: visualEnd };
    });
}

function buildTimetableSheet(projectTitle: string, daysInput: ExportDay[], itemsInput: ExportItem[]): VisualSheet {
  const days = daysInput
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.date.localeCompare(b.date));
  const dayIds = new Set(days.map((day) => day.id));
  const timedItems = itemsInput.filter((item) => !item.all_day && dayIds.has(item.day_id));
  const allDayItems = itemsInput.filter((item) => item.all_day && dayIds.has(item.day_id));
  const packedByDay = new Map(days.map((day) => [day.id, packTimedItems(timedItems.filter((item) => item.day_id === day.id))]));
  const laneCounts = days.map((day) => Math.max(1, Math.max(0, ...(packedByDay.get(day.id) ?? []).map((entry) => entry.lane + 1))));
  const dayColumnStarts: number[] = [];
  let nextColumn = 1;
  for (const laneCount of laneCounts) {
    dayColumnStarts.push(nextColumn);
    nextColumn += laneCount;
  }

  const columnCount = nextColumn + 1;
  const columns = [
    { width: 12 },
    ...laneCounts.flatMap((laneCount) => Array.from({ length: laneCount }, () => ({ width: laneCount > 1 ? 14 : 18 }))),
    { width: 12 }
  ];

  const minStart = timedItems.length ? Math.min(...timedItems.map((item) => toMinutes(item.start_time))) : DEFAULT_START_MINUTES;
  const maxEnd = timedItems.length ? Math.max(...timedItems.map((item) => toMinutes(item.end_time))) : DEFAULT_END_MINUTES;
  const startMinute = Math.max(0, floorToHalfHour(minStart));
  const endMinute = Math.min(24 * 60, Math.max(startMinute + HALF_HOUR, ceilToHalfHour(maxEnd)));
  const slotCount = Math.max(1, (endMinute - startMinute) / HALF_HOUR);

  const data: SheetData = [
    [
      spanCell(`${projectTitle} 시간표`, columnCount, {
        height: 26,
        fontSize: 16,
        fontWeight: "bold",
        backgroundColor: "#FEF973",
        borderColor: "#404040",
        borderStyle: "medium"
      }),
      ...Array.from({ length: columnCount - 1 }, () => null)
    ],
    [
      spanCell(`내보낸 날짜 ${new Date().toISOString().slice(0, 10)}`, columnCount, {
        height: 22,
        align: "right",
        backgroundColor: "#E9D5FF",
        borderColor: "#B8B8B8",
        borderStyle: "thin"
      }),
      ...Array.from({ length: columnCount - 1 }, () => null)
    ]
  ];

  const header = createEmptyRow(columnCount, 22);
  header[0] = cell("", { backgroundColor: "#F5F5F5", borderColor: "#404040", borderStyle: "medium" });
  days.forEach((day, dayIndex) => {
    const startCol = dayColumnStarts[dayIndex];
    header[startCol] = spanCell(formatKoreanDate(day.date), laneCounts[dayIndex], {
      fontSize: 12,
      fontWeight: "bold",
      backgroundColor: "#FEFCE8",
      borderColor: "#404040",
      borderStyle: "medium"
    });
    for (let offset = 1; offset < laneCounts[dayIndex]; offset += 1) {
      header[startCol + offset] = null;
    }
  });
  header[columnCount - 1] = cell("", { backgroundColor: "#F5F5F5", borderColor: "#404040", borderStyle: "medium" });
  data.push(header);

  if (allDayItems.length) {
    const allDayRow = createEmptyRow(columnCount, 24);
    allDayRow[0] = cell("종일", { backgroundColor: "#BAE6FD", borderColor: "#404040", borderStyle: "medium" });
    allDayRow[columnCount - 1] = cell("종일", { backgroundColor: "#BAE6FD", borderColor: "#404040", borderStyle: "medium" });
    days.forEach((day, dayIndex) => {
      const labels = allDayItems
        .filter((item) => {
          const start = days.findIndex((candidate) => candidate.id === item.day_id);
          const end = item.end_day_id ? days.findIndex((candidate) => candidate.id === item.end_day_id) : start;
          return start >= 0 && dayIndex >= start && dayIndex <= Math.max(start, end);
        })
        .map((item) => item.title);
      if (labels.length) {
        const startCol = dayColumnStarts[dayIndex];
        allDayRow[startCol] = spanCell(labels.join("\n"), laneCounts[dayIndex], {
          backgroundColor: "#FED7AA",
          borderColor: "#D97706",
          borderStyle: "thin",
          fontWeight: "bold"
        });
        for (let offset = 1; offset < laneCounts[dayIndex]; offset += 1) {
          allDayRow[startCol + offset] = null;
        }
      }
    });
    data.push(allDayRow);
  }

  const bodyStartRow = data.length;
  for (let slot = 0; slot < slotCount; slot += 1) {
    const time = toTime(startMinute + slot * HALF_HOUR);
    const row = createEmptyRow(columnCount, 18);
    row[0] = cell(time, {
      height: 18,
      backgroundColor: "#BAE6FD",
      borderColor: "#404040",
      borderStyle: "thin"
    });
    row[columnCount - 1] = cell(time, {
      backgroundColor: "#BAE6FD",
      borderColor: "#404040",
      borderStyle: "thin"
    });
    data.push(row);
  }

  days.forEach((day, dayIndex) => {
    const startCol = dayColumnStarts[dayIndex];
    for (const { item, lane, start, end } of packedByDay.get(day.id) ?? []) {
      const clippedStart = Math.max(startMinute, floorToHalfHour(start));
      const clippedEnd = Math.min(endMinute, ceilToHalfHour(end));
      if (clippedEnd <= clippedStart) continue;
      const rowIndex = bodyStartRow + (clippedStart - startMinute) / HALF_HOUR;
      const rowSpan = Math.max(1, (clippedEnd - clippedStart) / HALF_HOUR);
      const columnIndex = startCol + lane;
      const label = [item.title, item.location, `${item.start_time.slice(0, 5)}~${item.end_time.slice(0, 5)}`]
        .filter(Boolean)
        .join("\n");
      data[rowIndex][columnIndex] = cell(label, {
        rowSpan,
        fontWeight: "bold",
        backgroundColor: softenColor(item.color, dayIndex + lane),
        borderColor: "#666666",
        borderStyle: "medium"
      });
      for (let offset = 1; offset < rowSpan; offset += 1) {
        data[rowIndex + offset][columnIndex] = null;
      }
    }
  });

  return { data, columns };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId가 필요해요." }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "서버 설정이 필요해요." }, { status: 500 });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요해요." }, { status: 401 });

  // RLS makes sure the caller is a member of this project.
  const { data: project } = await supabase
    .from("projects")
    .select("id, title")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: "시간표를 찾을 수 없어요." }, { status: 404 });

  const [{ data: days }, { data: items }, { data: notes }] = await Promise.all([
    supabase.from("project_days").select("id, date, sort_order").eq("project_id", projectId),
    supabase
      .from("schedule_items")
      .select("day_id, end_day_id, title, description, location, start_time, end_time, all_day, color")
      .eq("project_id", projectId),
    supabase
      .from("project_notes")
      .select("body, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
  ]);

  const dayById = new Map((days ?? []).map((day) => [day.id, day]));
  const visualSheet = buildTimetableSheet(project.title, (days ?? []) as ExportDay[], (items ?? []) as ExportItem[]);

  const rows: Row[] = (items ?? [])
    .map((item) => {
      const day = dayById.get(item.day_id);
      return { item, date: day?.date ?? "" };
    })
    .filter((entry) => entry.date)
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        Number(b.item.all_day) - Number(a.item.all_day) ||
        a.item.start_time.localeCompare(b.item.start_time)
    )
    .map(({ item, date }) => {
      // Multi-day all-day items show their full range in the date cell.
      const endDate = item.end_day_id ? dayById.get(item.end_day_id)?.date : undefined;
      return {
        date: endDate && endDate !== date ? `${date} ~ ${endDate}` : date,
        weekday: WEEKDAY_KO[new Date(`${date}T00:00:00`).getDay()] ?? "",
        kind: item.all_day ? "종일" : "시간",
        start: item.all_day ? "" : item.start_time.slice(0, 5),
        end: item.all_day ? "" : item.end_time.slice(0, 5),
        title: item.title,
        location: item.location ?? "",
        memo: item.description ?? ""
      };
    });

  const noteRows: NoteRow[] = (notes ?? []).map((note) => ({
    body: note.body,
    createdAt: note.created_at.slice(0, 10)
  }));

  const file = await writeXlsxFile([
    {
      sheet: "시간표",
      data: visualSheet.data,
      columns: visualSheet.columns,
      orientation: "landscape",
      stickyRowsCount: 3,
      stickyColumnsCount: 1,
      showGridLines: false,
      zoomScale: 0.9
    },
    {
      sheet: "일정",
      data: getSheetData(rows, scheduleColumns),
      columns: scheduleColumns.map((column) => ({ width: column.width }))
    },
    {
      sheet: "메모",
      data: getSheetData(noteRows, noteColumns),
      columns: noteColumns.map((column) => ({ width: column.width }))
    }
  ]);
  const buffer = await file.toBuffer();

  const filename = encodeURIComponent(`${project.title}.xlsx`);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store"
    }
  });
}
