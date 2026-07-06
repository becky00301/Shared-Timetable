"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import {
  seedAttachments,
  seedAvailability,
  seedDays,
  seedMembers,
  seedProjects,
  seedSchedules
} from "@/lib/db/seed";
import type { Project, ProjectDay, ProjectMember } from "@/types/project";
import type { Attachment, AvailabilitySlot, ScheduleItem } from "@/types/schedule";

type ProjectStore = {
  projects: Project[];
  days: ProjectDay[];
  members: ProjectMember[];
  schedules: ScheduleItem[];
  availability: AvailabilitySlot[];
  attachments: Attachment[];
  createProject: (title: string, description?: string) => Project;
  addDay: (projectId: string, date: string) => void;
  removeDay: (dayId: string) => void;
  upsertSchedule: (item: Partial<ScheduleItem> & Pick<ScheduleItem, "project_id" | "day_id" | "title" | "start_time" | "end_time">) => ScheduleItem;
  deleteSchedule: (itemId: string) => void;
  addAvailability: (slot: Omit<AvailabilitySlot, "id" | "created_at">) => void;
  getProjectBySlug: (slug: string) => Project | undefined;
};

const now = () => new Date().toISOString();
const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 64);

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: seedProjects,
  days: seedDays,
  members: seedMembers,
  schedules: seedSchedules,
  availability: seedAvailability,
  attachments: seedAttachments,
  createProject: (title, description) => {
    const project: Project = {
      id: `p-${nanoid(8)}`,
      owner_id: "u-jiho",
      title,
      description,
      slug: `${slugify(title)}-${nanoid(4)}`,
      invite_token: `invite-${nanoid(16)}`,
      created_at: now(),
      updated_at: now()
    };
    const member: ProjectMember = {
      id: `m-${nanoid(8)}`,
      project_id: project.id,
      user_id: "u-jiho",
      role: "owner",
      created_at: now(),
      user: seedUsersFallback()
    };
    set((state) => ({
      projects: [project, ...state.projects],
      members: [member, ...state.members]
    }));
    return project;
  },
  addDay: (projectId, date) =>
    set((state) => {
      if (state.days.some((day) => day.project_id === projectId && day.date === date)) {
        return state;
      }
      const sortOrder = state.days.filter((day) => day.project_id === projectId).length;
      return {
        days: [
          ...state.days,
          {
            id: `d-${nanoid(8)}`,
            project_id: projectId,
            date,
            sort_order: sortOrder,
            created_at: now()
          }
        ]
      };
    }),
  removeDay: (dayId) =>
    set((state) => ({
      days: state.days.filter((day) => day.id !== dayId),
      schedules: state.schedules.filter((item) => item.day_id !== dayId),
      availability: state.availability.filter((slot) => slot.day_id !== dayId)
    })),
  upsertSchedule: (item) => {
    const next: ScheduleItem = {
      id: item.id ?? `s-${nanoid(8)}`,
      project_id: item.project_id,
      day_id: item.day_id,
      creator_id: item.creator_id ?? "u-jiho",
      title: item.title,
      description: item.description ?? null,
      location: item.location ?? null,
      start_time: item.start_time,
      end_time: item.end_time,
      color: item.color ?? "#1972F7",
      created_at: item.created_at ?? now(),
      updated_at: now()
    };

    set((state) => ({
      schedules: state.schedules.some((schedule) => schedule.id === next.id)
        ? state.schedules.map((schedule) => (schedule.id === next.id ? next : schedule))
        : [...state.schedules, next]
    }));

    return next;
  },
  deleteSchedule: (itemId) =>
    set((state) => ({
      schedules: state.schedules.filter((item) => item.id !== itemId),
      attachments: state.attachments.filter((item) => item.schedule_item_id !== itemId)
    })),
  addAvailability: (slot) =>
    set((state) => ({
      availability: [
        ...state.availability,
        {
          ...slot,
          id: `a-${nanoid(8)}`,
          created_at: now()
        }
      ]
    })),
  getProjectBySlug: (slug) => get().projects.find((project) => project.slug === slug)
}));

function seedUsersFallback() {
  return {
    id: "u-jiho",
    email: "jiho@example.com",
    name: "Jiho Kwon",
    avatar: null,
    created_at: now()
  };
}
