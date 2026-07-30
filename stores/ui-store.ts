"use client";

import { create } from "zustand";
import { clampZoom } from "@/lib/utils/time";

type UiStore = {
  selectedScheduleId: string | null;
  activeMode: "schedule" | "availability";
  viewMode: "grid" | "month";
  weekStartsOnSunday: boolean;
  /** Time-grid scale, 1 = 100%. Drives both hour height and column width. */
  gridZoom: number;
  isCreateProjectOpen: boolean;
  isShareOpen: boolean;
  setSelectedSchedule: (id: string | null) => void;
  setMode: (mode: "schedule" | "availability") => void;
  setViewMode: (mode: "grid" | "month") => void;
  setWeekStartsOnSunday: (sundayFirst: boolean) => void;
  setGridZoom: (zoom: number) => void;
  setCreateProjectOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  selectedScheduleId: null,
  activeMode: "schedule",
  viewMode: "grid",
  weekStartsOnSunday: false,
  gridZoom: 1,
  isCreateProjectOpen: false,
  isShareOpen: false,
  setSelectedSchedule: (id) => set({ selectedScheduleId: id }),
  setMode: (mode) => set({ activeMode: mode }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setWeekStartsOnSunday: (sundayFirst) => set({ weekStartsOnSunday: sundayFirst }),
  setGridZoom: (zoom) => set({ gridZoom: clampZoom(zoom) }),
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  setShareOpen: (open) => set({ isShareOpen: open })
}));
