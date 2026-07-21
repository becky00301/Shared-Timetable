import { NextResponse } from "next/server";
import writeXlsxFile, { getSheetData, type Column } from "write-excel-file/node";
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
      .select("day_id, end_day_id, title, description, location, start_time, end_time, all_day")
      .eq("project_id", projectId),
    supabase
      .from("project_notes")
      .select("body, created_at")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
  ]);

  const dayById = new Map((days ?? []).map((day) => [day.id, day]));

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
