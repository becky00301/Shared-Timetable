import { NextResponse } from "next/server";
import {
  calendarExists,
  createCalendar,
  deleteEvent,
  insertEvent,
  updateEvent,
  type SyncEventInput
} from "@/lib/google/calendar";
import { getAccessToken } from "@/lib/google/oauth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SYNC_LABELS = {
  ko: {
    needLogin: "로그인이 필요해요.",
    needProjectId: "projectId가 필요해요.",
    connectFirst: "구글 계정을 먼저 연결해주세요.",
    notFound: "시간표를 찾을 수 없어요.",
    serverConfig: "서버 설정이 필요해요.",
    syncFailed: "동기화에 실패했어요."
  },
  en: {
    needLogin: "You need to be logged in.",
    needProjectId: "projectId is required.",
    connectFirst: "Connect your Google account first.",
    notFound: "Timetable not found.",
    serverConfig: "Server configuration is missing.",
    syncFailed: "Sync failed."
  }
} as const;

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const body = (await request.json().catch(() => ({}))) as { projectId?: string; locale?: string };
  const labels = SYNC_LABELS[body.locale === "en" ? "en" : "ko"];
  if (!user || !supabase) return NextResponse.json({ error: labels.needLogin }, { status: 401 });

  const projectId = body.projectId;
  if (!projectId) return NextResponse.json({ error: labels.needProjectId }, { status: 400 });

  const accessToken = await getAccessToken(user.id);
  if (!accessToken) {
    return NextResponse.json({ error: labels.connectFirst }, { status: 400 });
  }

  // Read through the user's own session so RLS confirms they can see this project.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, title, google_calendar_id")
    .eq("id", projectId)
    .maybeSingle();
  if (projectError || !project) {
    return NextResponse.json({ error: labels.notFound }, { status: 404 });
  }

  const [{ data: days }, { data: items }] = await Promise.all([
    supabase.from("project_days").select("id, date").eq("project_id", projectId),
    supabase
      .from("schedule_items")
      .select("id, day_id, end_day_id, title, description, location, start_time, end_time, all_day, google_event_id")
      .eq("project_id", projectId)
  ]);

  const dateByDayId = new Map((days ?? []).map((day) => [day.id, day.date]));
  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: labels.serverConfig }, { status: 500 });

  try {
    // Reuse the project's calendar, recreating it if the user deleted it in Google.
    let calendarId = project.google_calendar_id;
    if (!calendarId || !(await calendarExists(accessToken, calendarId))) {
      calendarId = await createCalendar(accessToken, `Planner Together · ${project.title}`);
      const { error } = await admin
        .from("projects")
        .update({ google_calendar_id: calendarId })
        .eq("id", projectId);
      if (error) throw error;
    }

    let created = 0;
    let updated = 0;
    let removed = 0;

    for (const item of items ?? []) {
      const date = dateByDayId.get(item.day_id);
      // The day was removed but the schedule lingered: drop its Google event.
      if (!date) {
        if (item.google_event_id) {
          await deleteEvent(accessToken, calendarId, item.google_event_id);
          await admin.from("schedule_items").update({ google_event_id: null }).eq("id", item.id);
          removed += 1;
        }
        continue;
      }

      const input: SyncEventInput = {
        date,
        startTime: item.start_time,
        endTime: item.end_time,
        title: item.title,
        description: item.description,
        location: item.location,
        allDay: item.all_day,
        endDate: item.end_day_id ? dateByDayId.get(item.end_day_id) : null
      };

      if (item.google_event_id) {
        try {
          await updateEvent(accessToken, calendarId, item.google_event_id, input);
          updated += 1;
          continue;
        } catch {
          // Event vanished on Google's side; fall through and recreate it.
        }
      }

      const eventId = await insertEvent(accessToken, calendarId, input);
      await admin.from("schedule_items").update({ google_event_id: eventId }).eq("id", item.id);
      created += 1;
    }

    return NextResponse.json({ ok: true, created, updated, removed });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : labels.syncFailed },
      { status: 500 }
    );
  }
}
