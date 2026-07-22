"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Project, ProjectDay, ProjectKind, ProjectMember, ProjectNote } from "@/types/project";
import type { Attachment, AvailabilitySlot, ScheduleItem } from "@/types/schedule";

type ProjectStore = {
  currentUserId: string | null;
  loading: boolean;
  projects: Project[];
  days: ProjectDay[];
  members: ProjectMember[];
  schedules: ScheduleItem[];
  availability: AvailabilitySlot[];
  attachments: Attachment[];
  notes: ProjectNote[];
  loadCurrentUser: () => Promise<string | null>;
  loadDashboard: () => Promise<void>;
  loadProject: (slug: string) => Promise<Project | null>;
  createProject: (title: string, description?: string, kind?: ProjectKind) => Promise<Project>;
  updateProject: (projectId: string, patch: { title?: string; description?: string }) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  addDay: (projectId: string, date: string) => Promise<void>;
  addDays: (projectId: string, dates: string[]) => Promise<void>;
  addNote: (projectId: string, body: string) => Promise<void>;
  updateNote: (noteId: string, body: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  removeDay: (dayId: string) => Promise<void>;
  upsertSchedule: (
    item: Partial<ScheduleItem> & Pick<ScheduleItem, "project_id" | "day_id" | "title" | "start_time" | "end_time">
  ) => Promise<ScheduleItem>;
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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  currentUserId: null,
  loading: false,
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
    set({ currentUserId: id });
    return id;
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
        days: (daysRes.data ?? []) as ProjectDay[],
        schedules: (schedulesRes.data ?? []) as ScheduleItem[]
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

      set((state) => ({
        projects: [project as Project, ...state.projects.filter((p) => p.id !== project.id)],
        days: [...state.days.filter((d) => d.project_id !== project.id), ...((daysRes.data ?? []) as ProjectDay[])],
        members: [
          ...state.members.filter((m) => m.project_id !== project.id),
          ...((membersRes.data ?? []) as ProjectMember[])
        ],
        schedules: [
          ...state.schedules.filter((s) => s.project_id !== project.id),
          ...((schedulesRes.data ?? []) as ScheduleItem[])
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
    if (!data?.length) throw new Error("삭제 권한이 없어요. 소유자만 삭제할 수 있어요.");
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
    if (!data?.length) throw new Error("삭제 권한이 없어요.");
    set((state) => ({ notes: state.notes.filter((note) => note.id !== noteId) }));
  },

  removeDay: async (dayId) => {
    const supabase = requireClient();
    const { data, error } = await supabase.from("project_days").delete().eq("id", dayId).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("삭제 권한이 없어요.");
    set((state) => ({
      days: state.days.filter((day) => day.id !== dayId),
      schedules: state.schedules.filter((item) => item.day_id !== dayId),
      availability: state.availability.filter((slot) => slot.day_id !== dayId)
    }));
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
      color: item.color ?? "#1972F7",
      all_day: item.all_day ?? false,
      end_day_id: item.end_day_id ?? null
    };

    if (item.id) {
      const { data, error } = await supabase
        .from("schedule_items")
        .update(payload)
        .eq("id", item.id)
        .select("*")
        .single();
      if (error) throw error;
      set((state) => ({
        schedules: state.schedules.map((schedule) => (schedule.id === data.id ? (data as ScheduleItem) : schedule))
      }));
      return data as ScheduleItem;
    }

    const userId = get().currentUserId ?? (await get().loadCurrentUser());
    if (!userId) throw new Error("Not authenticated.");
    const { data, error } = await supabase
      .from("schedule_items")
      .insert({ ...payload, creator_id: userId })
      .select("*")
      .single();
    if (error) throw error;
    set((state) => ({ schedules: [...state.schedules, data as ScheduleItem] }));
    return data as ScheduleItem;
  },

  deleteSchedule: async (itemId) => {
    const supabase = requireClient();
    const { data, error } = await supabase.from("schedule_items").delete().eq("id", itemId).select("id");
    if (error) throw error;
    // RLS refusals come back as success with zero rows, not as an error — so
    // does deleting something a collaborator already removed.
    if (!data?.length) {
      throw new Error("이 일정을 삭제할 권한이 없거나, 이미 삭제된 일정이에요.");
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
  reset: () =>
    set({
      currentUserId: null,
      projects: [],
      days: [],
      members: [],
      schedules: [],
      availability: [],
      attachments: [],
      notes: []
    }),

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
