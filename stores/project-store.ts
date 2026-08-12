"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { translate } from "@/lib/i18n/messages";
import { diffDays, sortOrderFor } from "@/lib/utils/days";
import { DEFAULT_SCHEDULE_COLOR } from "@/lib/utils/schedule-colors";
import type { Project, ProjectDay, ProjectKind, ProjectMember, ProjectNote } from "@/types/project";
import type { Attachment, AvailabilitySlot, ScheduleItem } from "@/types/schedule";

type ProjectStore = {
  currentUserId: string | null;
  /** Signed in through anonymous auth: the account exists only as long as this
      browser keeps its session, so guests are warned to save their link. */
  isGuest: boolean;
  loading: boolean;
  /** True once loadDashboard has fetched the full project list. loadProject
      only ever adds a single project, so without this the dashboard can't tell
      a complete list from a one-project cache. */
  projectsLoaded: boolean;
  projects: Project[];
  days: ProjectDay[];
  members: ProjectMember[];
  schedules: ScheduleItem[];
  availability: AvailabilitySlot[];
  attachments: Attachment[];
  notes: ProjectNote[];
  loadCurrentUser: () => Promise<string | null>;
  /** Signs in anonymously, creates the guest's single timetable, and returns
      its slug to navigate to. */
  signInAsGuest: () => Promise<string>;
  /** Slug of the timetable a guest owns, for redirecting them out of pages
      that assume an account. */
  findGuestProjectSlug: () => Promise<string | null>;
  loadDashboard: () => Promise<void>;
  loadProject: (slug: string) => Promise<Project | null>;
  createProject: (title: string, description?: string, kind?: ProjectKind) => Promise<Project>;
  updateProject: (projectId: string, patch: { title?: string; description?: string }) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addDay: (projectId: string, date: string) => Promise<void>;
  addDays: (projectId: string, dates: string[]) => Promise<void>;
  updateDayWakeTime: (
    dayId: string,
    wakeTime: string | null,
    sleepDurationMinutes?: number
  ) => Promise<void>;
  addNote: (projectId: string, body: string) => Promise<void>;
  updateNote: (noteId: string, body: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  removeDay: (dayId: string) => Promise<void>;
  /** Moves a timetable onto a new set of dates. Dates that survive the change
      keep their id, so their schedules and notes are untouched. */
  replaceDays: (projectId: string, dates: string[]) => Promise<void>;
  upsertSchedule: (
    item: Partial<ScheduleItem> & Pick<ScheduleItem, "project_id" | "day_id" | "title" | "start_time" | "end_time">
  ) => Promise<ScheduleItem>;
  undoScheduleChange: (projectId: string) => Promise<boolean>;
  deleteSchedule: (itemId: string) => Promise<void>;
  addAvailability: (slot: Omit<AvailabilitySlot, "id" | "created_at" | "user_id">) => Promise<void>;
  reset: () => void;
  joinByInviteToken: (token: string) => Promise<string>;
  updateMemberRole: (memberId: string, role: "editor" | "viewer") => Promise<void>;
  getProjectBySlug: (slug: string) => Project | undefined;
};

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);

function requireClient() {
  const supabase = createSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase is not configured.");
  return supabase;
}

// Realtime refetches can land while a local update is still in flight. Keep
// the local version layered over fetched rows so a moved or resized block does
// not disappear and then reappear at the server-confirmed position.
const pendingScheduleUpdates = new Map<string, ScheduleItem>();
const pendingDayWakeTimeUpdates = new Map<string, ProjectDay>();
const replayingScheduleIds = new Set<string>();
const undoInFlightProjectIds = new Set<string>();
const MAX_SCHEDULE_HISTORY = 50;
let nextScheduleHistoryId = 1;

type ScheduleHistoryEntry =
  | { id: number; kind: "update"; projectId: string; before: ScheduleItem; after: ScheduleItem }
  | { id: number; kind: "create"; projectId: string; after: ScheduleItem };
type ScheduleHistoryInput =
  | { kind: "update"; projectId: string; before: ScheduleItem; after: ScheduleItem }
  | { kind: "create"; projectId: string; after: ScheduleItem };

const scheduleHistory: ScheduleHistoryEntry[] = [];
const editableScheduleKeys = [
  "project_id",
  "day_id",
  "title",
  "description",
  "location",
  "start_time",
  "end_time",
  "color",
  "all_day",
  "end_day_id"
] as const satisfies readonly (keyof ScheduleItem)[];

function sameEditableSchedule(left: ScheduleItem, right: ScheduleItem) {
  return editableScheduleKeys.every((key) => {
    const leftValue = left[key] ?? null;
    const rightValue = right[key] ?? null;
    if ((key === "start_time" || key === "end_time") && typeof leftValue === "string" && typeof rightValue === "string") {
      return leftValue.slice(0, 5) === rightValue.slice(0, 5);
    }
    return leftValue === rightValue;
  });
}

function addScheduleHistory(entry: ScheduleHistoryInput) {
  const saved = { ...entry, id: nextScheduleHistoryId++ } as ScheduleHistoryEntry;
  scheduleHistory.push(saved);
  if (scheduleHistory.length > MAX_SCHEDULE_HISTORY) scheduleHistory.shift();
  return saved;
}

function removeScheduleHistoryEntry(entryId: number) {
  const index = scheduleHistory.findIndex((entry) => entry.id === entryId);
  if (index >= 0) scheduleHistory.splice(index, 1);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentUserId: null,
  isGuest: false,
  loading: false,
  projectsLoaded: false,
  projects: [],
  days: [],
  members: [],
  schedules: [],
  availability: [],
  attachments: [],
  notes: [],

  loadCurrentUser: async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return null;
    const { data } = await supabase.auth.getUser();
    const id = data.user?.id ?? null;
    set({ currentUserId: id, isGuest: Boolean(data.user?.is_anonymous) });
    return id;
  },

  // Guest mode is a trial: one timetable, no dashboard. The project is created
  // up front so the guest lands straight in the editor, and its slug is the
  // only handle they have on it — hence the "save your link" warning there.
  signInAsGuest: async () => {
    const supabase = requireClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    const id = data.user?.id ?? null;
    set({ currentUserId: id, isGuest: true });
    const project = await get().createProject(translate("guest.projectTitle"));
    return project.slug;
  },

  findGuestProjectSlug: async () => {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("projects")
      .select("slug")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data?.slug ?? null;
  },

  loadDashboard: async () => {
    const supabase = requireClient();
    set({ loading: true });
    try {
      await get().loadCurrentUser();
      const [projectsRes, daysRes, schedulesRes] = await Promise.all([
        supabase.from("projects").select("*").order("created_at", { ascending: false }),
        supabase.from("project_days").select("*"),
        supabase.from("schedule_items").select("*")
      ]);
      if (projectsRes.error) throw projectsRes.error;
      if (daysRes.error) throw daysRes.error;
      if (schedulesRes.error) throw schedulesRes.error;

      set({
        projects: (projectsRes.data ?? []) as Project[],
        days: ((daysRes.data ?? []) as ProjectDay[]).map(
          (day) => pendingDayWakeTimeUpdates.get(day.id) ?? day
        ),
        schedules: (schedulesRes.data ?? []) as ScheduleItem[],
        projectsLoaded: true
      });
    } finally {
      set({ loading: false });
    }
  },

  loadProject: async (slug) => {
    const supabase = requireClient();
    set({ loading: true });
    try {
      await get().loadCurrentUser();
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (projectError) throw projectError;
      if (!project) return null;

      const [daysRes, membersRes, schedulesRes, availabilityRes, attachmentsRes, notesRes] =
        await Promise.all([
          supabase.from("project_days").select("*").eq("project_id", project.id),
          supabase.from("project_members").select("*, user:users(*)").eq("project_id", project.id),
          supabase.from("schedule_items").select("*").eq("project_id", project.id),
          supabase.from("availability").select("*").eq("project_id", project.id),
          supabase.from("attachments").select("*").eq("project_id", project.id),
          supabase
            .from("project_notes")
            .select("*")
            .eq("project_id", project.id)
            .order("created_at", { ascending: true })
        ]);
      if (daysRes.error) throw daysRes.error;
      if (membersRes.error) throw membersRes.error;
      if (schedulesRes.error) throw schedulesRes.error;
      if (availabilityRes.error) throw availabilityRes.error;
      if (attachmentsRes.error) throw attachmentsRes.error;
      if (notesRes.error) throw notesRes.error;

      const loadedSchedules = ((schedulesRes.data ?? []) as ScheduleItem[]).map(
        (schedule) => pendingScheduleUpdates.get(schedule.id) ?? schedule
      );
      const loadedDays = ((daysRes.data ?? []) as ProjectDay[]).map(
        (day) => pendingDayWakeTimeUpdates.get(day.id) ?? day
      );

      set((state) => ({
        // Refresh in place. Hoisting the visited project to the front would
        // silently reshuffle the dashboard every time you opened a timetable.
        projects: state.projects.some((p) => p.id === project.id)
          ? state.projects.map((p) => (p.id === project.id ? (project as Project) : p))
          : [...state.projects, project as Project],
        days: [...state.days.filter((d) => d.project_id !== project.id), ...loadedDays],
        members: [
          ...state.members.filter((m) => m.project_id !== project.id),
          ...((membersRes.data ?? []) as ProjectMember[])
        ],
        schedules: [
          ...state.schedules.filter((s) => s.project_id !== project.id),
          ...loadedSchedules
        ],
        availability: [
          ...state.availability.filter((a) => a.project_id !== project.id),
          ...((availabilityRes.data ?? []) as AvailabilitySlot[])
        ],
        attachments: [
          ...state.attachments.filter((a) => a.project_id !== project.id),
          ...((attachmentsRes.data ?? []) as Attachment[])
        ],
        notes: [
          ...state.notes.filter((n) => n.project_id !== project.id),
          ...((notesRes.data ?? []) as ProjectNote[])
        ]
      }));

      return project as Project;
    } finally {
      set({ loading: false });
    }
  },

  createProject: async (title, description, kind = "daterange") => {
    const supabase = requireClient();
    const userId = get().currentUserId ?? (await get().loadCurrentUser());
    if (!userId) throw new Error("Not authenticated.");

    const slug = `${slugify(title)}-${nanoid(4)}`;
    const { data: project, error } = await supabase
      .from("projects")
      .insert({ title, description: description || null, slug, kind, owner_id: userId })
      .select("*")
      .single();
    if (error) throw error;

    const { error: memberError } = await supabase
      .from("project_members")
      .insert({ project_id: project.id, user_id: userId, role: "owner" });
    if (memberError) throw memberError;

    set((state) => ({ projects: [project as Project, ...state.projects] }));
    return project as Project;
  },

  updateProject: async (projectId, patch) => {
    const supabase = requireClient();
    const payload: { title?: string; description?: string | null } = {};
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.description !== undefined) payload.description = patch.description || null;
    const { data, error } = await supabase
      .from("projects")
      .update(payload)
      .eq("id", projectId)
      .select("*")
      .single();
    if (error) throw error;
    set((state) => ({
      projects: state.projects.map((project) => (project.id === projectId ? (data as Project) : project))
    }));
  },

  deleteProject: async (projectId) => {
    const supabase = requireClient();
    // RLS-blocked deletes come back as success with zero rows, so confirm a row
    // actually went away instead of trusting the missing error.
    const { data, error } = await supabase.from("projects").delete().eq("id", projectId).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error(translate("error.projectDeleteDenied"));
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
      days: state.days.filter((day) => day.project_id !== projectId),
      members: state.members.filter((member) => member.project_id !== projectId),
      schedules: state.schedules.filter((schedule) => schedule.project_id !== projectId)
    }));
  },

  addDay: async (projectId, date) => {
    const supabase = requireClient();
    const sortOrder = get().days.filter((day) => day.project_id === projectId).length;
    const { data, error } = await supabase
      .from("project_days")
      .insert({ project_id: projectId, date, sort_order: sortOrder })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("This date has already been added.");
      throw error;
    }
    set((state) => ({ days: [...state.days, data as ProjectDay] }));
  },

  addDays: async (projectId, dates) => {
    const supabase = requireClient();
    const existing = new Set(
      get()
        .days.filter((day) => day.project_id === projectId)
        .map((day) => day.date)
    );
    const fresh = [...new Set(dates)].filter((date) => !existing.has(date));
    if (!fresh.length) return;

    const baseOrder = get().days.filter((day) => day.project_id === projectId).length;
    const { data, error } = await supabase
      .from("project_days")
      .insert(fresh.map((date, index) => ({ project_id: projectId, date, sort_order: baseOrder + index })))
      .select("*");
    if (error) throw error;
    set((state) => ({ days: [...state.days, ...((data ?? []) as ProjectDay[])] }));
  },

  updateDayWakeTime: async (dayId, wakeTime, sleepDurationMinutes) => {
    const supabase = requireClient();
    const previous = get().days.find((day) => day.id === dayId);
    if (!previous) throw new Error("Day not found.");

    const normalizedWakeTime = wakeTime ? wakeTime.slice(0, 5) : null;
    const normalizedSleepDuration = Math.min(
      720,
      Math.max(60, sleepDurationMinutes ?? previous.sleep_duration_minutes ?? 420)
    );
    const optimistic: ProjectDay = {
      ...previous,
      wake_time: normalizedWakeTime,
      sleep_duration_minutes: normalizedSleepDuration
    };
    pendingDayWakeTimeUpdates.set(dayId, optimistic);
    set((state) => ({
      days: state.days.map((day) => (day.id === dayId ? optimistic : day))
    }));

    try {
      let { data, error } = await supabase
        .from("project_days")
        .update({
          wake_time: normalizedWakeTime,
          sleep_duration_minutes: normalizedSleepDuration
        })
        .eq("id", dayId)
        .select("*")
        .single();
      // Keep wake-time editing operational during the brief window between
      // deploying this client and applying migration 014. Sleep duration will
      // persist as soon as the column exists.
      if (error?.code === "PGRST204" && error.message.includes("sleep_duration_minutes")) {
        const fallback = await supabase
          .from("project_days")
          .update({ wake_time: normalizedWakeTime })
          .eq("id", dayId)
          .select("*")
          .single();
        data = fallback.data
          ? { ...fallback.data, sleep_duration_minutes: normalizedSleepDuration }
          : fallback.data;
        error = fallback.error;
      }
      if (error) throw error;
      if (pendingDayWakeTimeUpdates.get(dayId) === optimistic) {
        pendingDayWakeTimeUpdates.delete(dayId);
        set((state) => ({
          days: state.days.map((day) => (day.id === dayId ? (data as ProjectDay) : day))
        }));
      }
    } catch (error) {
      if (pendingDayWakeTimeUpdates.get(dayId) === optimistic) {
        pendingDayWakeTimeUpdates.delete(dayId);
        set((state) => ({
          days: state.days.map((day) => (day.id === dayId && day === optimistic ? previous : day))
        }));
      }
      throw error;
    }
  },

  addNote: async (projectId, body) => {
    const supabase = requireClient();
    const userId = get().currentUserId ?? (await get().loadCurrentUser());
    const { data, error } = await supabase
      .from("project_notes")
      .insert({ project_id: projectId, body, creator_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    set((state) => ({ notes: [...state.notes, data as ProjectNote] }));
  },

  updateNote: async (noteId, body) => {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("project_notes")
      .update({ body })
      .eq("id", noteId)
      .select("*")
      .single();
    if (error) throw error;
    set((state) => ({
      notes: state.notes.map((note) => (note.id === noteId ? (data as ProjectNote) : note))
    }));
  },

  deleteNote: async (noteId) => {
    const supabase = requireClient();
    const { data, error } = await supabase.from("project_notes").delete().eq("id", noteId).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error(translate("error.deleteDenied"));
    set((state) => ({ notes: state.notes.filter((note) => note.id !== noteId) }));
  },

  removeDay: async (dayId) => {
    const supabase = requireClient();
    const { data, error } = await supabase.from("project_days").delete().eq("id", dayId).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error(translate("error.deleteDenied"));
    set((state) => ({
      days: state.days.filter((day) => day.id !== dayId),
      schedules: state.schedules.filter((item) => item.day_id !== dayId),
      availability: state.availability.filter((slot) => slot.day_id !== dayId)
    }));
  },

  replaceDays: async (projectId, dates) => {
    const supabase = requireClient();
    const current = get().days.filter((day) => day.project_id === projectId);
    // Only the dates falling outside the new range are deleted, so anything
    // scheduled on a date the range still covers survives untouched.
    const { dropped, added } = diffDays(current, dates);

    if (dropped.length) {
      const ids = dropped.map((day) => day.id);
      const { data, error } = await supabase.from("project_days").delete().in("id", ids).select("id");
      if (error) throw error;
      if (!data?.length) throw new Error(translate("error.deleteDenied"));
    }

    let inserted: ProjectDay[] = [];
    if (added.length) {
      const { data, error } = await supabase
        .from("project_days")
        .insert(added.map((date) => ({ project_id: projectId, date })))
        .select("*");
      if (error) throw error;
      inserted = (data ?? []) as ProjectDay[];
    }

    const droppedIds = new Set(dropped.map((day) => day.id));
    // Renumber against the final date list so the grid stays chronological.
    const order = sortOrderFor(dates);
    const survivors = [...current.filter((day) => !droppedIds.has(day.id)), ...inserted].map((day) => ({
      ...day,
      sort_order: order.get(day.date) ?? day.sort_order
    }));

    set((state) => ({
      days: [...state.days.filter((day) => day.project_id !== projectId), ...survivors],
      schedules: state.schedules.filter((item) => !droppedIds.has(item.day_id)),
      availability: state.availability.filter((slot) => !droppedIds.has(slot.day_id))
    }));

    if (survivors.length) {
      const { error } = await supabase.from("project_days").upsert(
        survivors.map((day) => ({ id: day.id, project_id: projectId, date: day.date, sort_order: day.sort_order }))
      );
      if (error) throw error;
    }
  },

  upsertSchedule: async (item) => {
    const supabase = requireClient();
    const payload = {
      project_id: item.project_id,
      day_id: item.day_id,
      title: item.title,
      description: item.description || null,
      location: item.location || null,
      start_time: item.start_time,
      end_time: item.end_time,
      color: item.color ?? DEFAULT_SCHEDULE_COLOR,
      all_day: item.all_day ?? false,
      end_day_id: item.end_day_id ?? null
    };

    if (item.id) {
      const previous = get().schedules.find((schedule) => schedule.id === item.id);
      const optimistic = previous ? ({ ...previous, ...payload } as ScheduleItem) : null;
      const historyEntry =
        previous &&
        optimistic &&
        !replayingScheduleIds.has(item.id) &&
        !sameEditableSchedule(previous, optimistic)
          ? addScheduleHistory({
              kind: "update",
              projectId: item.project_id,
              before: previous,
              after: optimistic
            })
          : null;
      if (optimistic) {
        pendingScheduleUpdates.set(item.id, optimistic);
        set((state) => ({
          schedules: state.schedules.map((schedule) => (schedule.id === item.id ? optimistic : schedule))
        }));
      }

      try {
        const { data, error } = await supabase
          .from("schedule_items")
          .update(payload)
          .eq("id", item.id)
          .select("*")
          .single();
        if (error) throw error;

        if (!optimistic || pendingScheduleUpdates.get(item.id) === optimistic) {
          pendingScheduleUpdates.delete(item.id);
          set((state) => ({
            schedules: state.schedules.map((schedule) =>
              schedule.id === data.id ? (data as ScheduleItem) : schedule
            )
          }));
        }
        return data as ScheduleItem;
      } catch (error) {
        if (historyEntry) removeScheduleHistoryEntry(historyEntry.id);
        if (optimistic && pendingScheduleUpdates.get(item.id) === optimistic) {
          pendingScheduleUpdates.delete(item.id);
          set((state) => ({
            schedules: state.schedules.map((schedule) => (schedule.id === item.id ? previous! : schedule))
          }));
        }
        throw error;
      }
    }

    const userId = get().currentUserId ?? (await get().loadCurrentUser());
    if (!userId) throw new Error("Not authenticated.");
    const { data, error } = await supabase
      .from("schedule_items")
      .insert({ ...payload, creator_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    const created = data as ScheduleItem;
    set((state) => ({ schedules: [...state.schedules, created] }));
    if (!replayingScheduleIds.has(created.id)) {
      addScheduleHistory({ kind: "create", projectId: created.project_id, after: created });
    }
    return created;
  },

  undoScheduleChange: async (projectId) => {
    if (undoInFlightProjectIds.has(projectId)) return false;
    undoInFlightProjectIds.add(projectId);
    try {
      for (let index = scheduleHistory.length - 1; index >= 0; index -= 1) {
        const entry = scheduleHistory[index];
        if (entry.projectId !== projectId) continue;
        scheduleHistory.splice(index, 1);

        const current = get().schedules.find((schedule) => schedule.id === entry.after.id);
        // A collaborator may have edited the item after this local action.
        // Never overwrite their newer state with an old local snapshot.
        if (!current || !sameEditableSchedule(current, entry.after)) continue;

        try {
          if (entry.kind === "create") {
            await get().deleteSchedule(entry.after.id);
          } else {
            replayingScheduleIds.add(entry.after.id);
            try {
              await get().upsertSchedule(entry.before);
            } finally {
              replayingScheduleIds.delete(entry.after.id);
            }
          }
          return true;
        } catch (error) {
          scheduleHistory.splice(Math.min(index, scheduleHistory.length), 0, entry);
          throw error;
        }
      }
      return false;
    } finally {
      undoInFlightProjectIds.delete(projectId);
    }
  },

  deleteSchedule: async (itemId) => {
    const supabase = requireClient();
    const { data, error } = await supabase.from("schedule_items").delete().eq("id", itemId).select("id");
    if (error) throw error;
    // RLS refusals come back as success with zero rows, not as an error — so
    // does deleting something a collaborator already removed.
    if (!data?.length) {
      throw new Error(translate("error.scheduleDeleteDenied"));
    }
    pendingScheduleUpdates.delete(itemId);
    for (let index = scheduleHistory.length - 1; index >= 0; index -= 1) {
      if (scheduleHistory[index].after.id === itemId) scheduleHistory.splice(index, 1);
    }
    set((state) => ({
      schedules: state.schedules.filter((item) => item.id !== itemId),
      attachments: state.attachments.filter((item) => item.schedule_item_id !== itemId)
    }));
  },

  addAvailability: async (slot) => {
    const supabase = requireClient();
    const userId = get().currentUserId ?? (await get().loadCurrentUser());
    if (!userId) throw new Error("Not authenticated.");
    const { data, error } = await supabase
      .from("availability")
      .insert({ ...slot, user_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    set((state) => ({ availability: [...state.availability, data as AvailabilitySlot] }));
  },

  // Wipe cached project data so a signed-out user never sees the previous
  // account's timetables lingering in memory.
  reset: () => {
    pendingScheduleUpdates.clear();
    pendingDayWakeTimeUpdates.clear();
    replayingScheduleIds.clear();
    undoInFlightProjectIds.clear();
    scheduleHistory.length = 0;
    set({
      currentUserId: null,
      isGuest: false,
      projectsLoaded: false,
      projects: [],
      days: [],
      members: [],
      schedules: [],
      availability: [],
      attachments: [],
      notes: []
    });
  },

  joinByInviteToken: async (token) => {
    const supabase = requireClient();
    const { data: projectId, error } = await supabase.rpc("join_project_by_invite", { token });
    if (error) throw error;
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();
    if (projectError) throw projectError;
    set((state) => ({ projects: [project as Project, ...state.projects.filter((p) => p.id !== project.id)] }));
    return (project as Project).slug;
  },

  updateMemberRole: async (memberId, role) => {
    const supabase = requireClient();
    const { data, error } = await supabase
      .from("project_members")
      .update({ role })
      .eq("id", memberId)
      .select("*, user:users(*)")
      .single();
    if (error) throw error;
    set((state) => ({
      members: state.members.map((member) => (member.id === memberId ? (data as ProjectMember) : member))
    }));
  },

  getProjectBySlug: (slug) => get().projects.find((project) => project.slug === slug)
}));
