import { NextResponse } from "next/server";
import {
  LABELS,
  renderDocument,
  resolveLocale,
  type Day,
  type Item
} from "@/lib/export/timetable-html";
import { exportFilename } from "@/lib/export/filename";
import { noteForExport } from "@/lib/notes/todo";
import { SCHEDULE_PHOTO_BUCKET } from "@/lib/schedule-photos";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PHOTO_TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

type ServerClient = NonNullable<Awaited<ReturnType<typeof createSupabaseServerClient>>>;

/** The project's items, each with its photo inlined and its focal point.
    Selecting every column keeps this working on a database that has not yet
    added the photo or focal-point columns: they are just absent. */
async function loadItems(supabase: ServerClient, projectId: string): Promise<Item[]> {
  const { data } = await supabase.from("schedule_items").select("*").eq("project_id", projectId);
  return Promise.all(
    (data ?? []).map(async (row) => {
      const record = row as Record<string, unknown>;
      const imagePath = typeof record.image_path === "string" ? record.image_path : null;
      const focusX = typeof record.image_focus_x === "number" ? record.image_focus_x : null;
      const focusY = typeof record.image_focus_y === "number" ? record.image_focus_y : null;
      return {
        day_id: row.day_id,
        end_day_id: row.end_day_id,
        title: row.title,
        description: row.description,
        location: row.location,
        start_time: row.start_time,
        end_time: row.end_time,
        all_day: row.all_day,
        color: row.color,
        photo: imagePath ? await inlinePhoto(supabase, imagePath) : null,
        photoFocusX: focusX,
        photoFocusY: focusY
      };
    })
  );
}

/** Downloads a photo as the signed-in member (Storage RLS applies) and
    returns it as a data URL. A photo that cannot be read is just left out. */
async function inlinePhoto(supabase: ServerClient, path: string) {
  const { data, error } = await supabase.storage.from(SCHEDULE_PHOTO_BUCKET).download(path);
  if (error || !data || !PHOTO_TYPES.has(data.type)) return null;
  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  return `data:${data.type};base64,${base64}`;
}

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

  const [{ data: days }, items, { data: notes }] = await Promise.all([
    supabase.from("project_days").select("id, date, sort_order").eq("project_id", projectId),
    loadItems(supabase, projectId),
    supabase
      .from("project_notes")
      .select("body")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true })
  ]);

  const html = renderDocument(
    project.title,
    (days ?? []) as Day[],
    items,
    (notes ?? []).map((note) => noteForExport(note.body)),
    labels,
    locale
  );

  const filename = encodeURIComponent(exportFilename(project.title, "html"));
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      "Cache-Control": "no-store"
    }
  });
}
