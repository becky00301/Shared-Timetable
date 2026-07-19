import "server-only";

const CALENDAR_API = "https://www.googleapis.com/calendar/v3";

export const SYNC_TIME_ZONE = "Asia/Seoul";

async function googleFetch(accessToken: string, path: string, init?: RequestInit) {
  const response = await fetch(`${CALENDAR_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Calendar ${response.status}: ${body.slice(0, 300)}`);
  }
  // DELETE returns an empty body.
  return response.status === 204 ? null : await response.json();
}

export async function createCalendar(accessToken: string, summary: string) {
  const data = await googleFetch(accessToken, "/calendars", {
    method: "POST",
    body: JSON.stringify({ summary, timeZone: SYNC_TIME_ZONE })
  });
  return data.id as string;
}

export async function calendarExists(accessToken: string, calendarId: string) {
  try {
    await googleFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}`);
    return true;
  } catch {
    return false;
  }
}

// schedule_items store a date (from project_days) plus wall-clock times, so send
// them as local times tagged with the sync time zone.
function toEventTime(date: string, time: string) {
  return { dateTime: `${date}T${time.slice(0, 8).padEnd(8, ":00")}`, timeZone: SYNC_TIME_ZONE };
}

export type SyncEventInput = {
  date: string;
  startTime: string;
  endTime: string;
  title: string;
  description?: string | null;
  location?: string | null;
};

function eventBody(input: SyncEventInput) {
  return {
    summary: input.title,
    description: input.description || undefined,
    location: input.location || undefined,
    start: toEventTime(input.date, input.startTime),
    end: toEventTime(input.date, input.endTime)
  };
}

export async function insertEvent(accessToken: string, calendarId: string, input: SyncEventInput) {
  const data = await googleFetch(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events`, {
    method: "POST",
    body: JSON.stringify(eventBody(input))
  });
  return data.id as string;
}

export async function updateEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  input: SyncEventInput
) {
  await googleFetch(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "PUT", body: JSON.stringify(eventBody(input)) }
  );
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  try {
    await googleFetch(
      accessToken,
      `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      { method: "DELETE" }
    );
  } catch {
    // Already gone on Google's side; nothing to clean up.
  }
}
