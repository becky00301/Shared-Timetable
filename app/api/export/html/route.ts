import { NextResponse } from "next/server";
import {
  LABELS,
  renderDocument,
  resolveLocale,
  type Day,
  type Item
} from "@/lib/export/timetable-html";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const locale = resolveLocale(searchParams.get("locale"));
  const labels = LABELS[locale];
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: labels.errNoProjectId }, { status: 400 });

  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: labels.errNoServerConfig }, { status: 500 });
  const {
    data: { user }
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: labels.errNeedLogin }, { status: 401 });

  // RLS makes sure the caller is a member of this project.
  const { data: project } = await supabase
    .from("projects")
    .select("id, title, slug")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) return NextResponse.json({ error: labels.errNotFound }, { status: 404 });

  const [{ data: days }, { data: items }, { data: notes }] = await Promise.all([
    supabase.from("project_days").select("id, date, sort_order").eq("project_id", projectId),
    supabase
      .from("schedule_items")
      .select("day_id, end_day_id, title, description, location, start_time, end_time, all_day, color")
      .eq("project_id", projectId),
    supabase
      .from("project_notes")
      .select("body")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
  ]);

  const html = renderDocument(
    project.title,
    (days ?? []) as Day[],
    (items ?? []) as Item[],
    (notes ?? []).map((note) => note.body),
    labels,
    locale
  );

  const filename = encodeURIComponent(`${project.slug || "timetable"}.html`);
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store"
    }
  });
}
