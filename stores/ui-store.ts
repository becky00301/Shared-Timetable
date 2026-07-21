"use client";

import { create } from "zustand";

type UiStore = {
  selectedScheduleId: string | null;
  activeMode: "schedule" | "availability";
  viewMode: "grid" | "month";
  weekStartsOnSunday: boolean;
  isCreateProjectOpen: boolean;
  isShareOpen: boolean;
  setSelectedSchedule: (id: string | null) => void;
  setMode: (mode: "schedule" | "availability") => void;
  setViewMode: (mode: "grid" | "month") => void;
  setWeekStartsOnSunday: (sundayFirst: boolean) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  selectedScheduleId: null,
  activeMode: "schedule",
  viewMode: "grid",
  weekStartsOnSunday: false,
  isCreateProjectOpen: false,
  isShareOpen: false,
  setSelectedSchedule: (id) => set({ selectedScheduleId: id }),
  setMode: (mode) => set({ activeMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setWeekStartsOnSunday: (sundayFirst) => set({ weekStartsOnSunday: sundayFirst }),
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  setShareOpen: (open) => set({ isShareOpen: open })
}));
