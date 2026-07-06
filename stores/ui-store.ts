"use client";

import { create } from "zustand";
import type { DraftSelection, ScheduleItem } from "@/types/schedule";

type UiStore = {
  selectedDateId: string | null;
  selectedScheduleId: string | null;
  activeMode: "schedule" | "availability";
  draftSelection: DraftSelection | null;
  isCreateProjectOpen: boolean;
  isAddDateOpen: boolean;
  isShareOpen: boolean;
  isScheduleModalOpen: boolean;
  setSelectedDate: (id: string | null) => void;
  setSelectedSchedule: (id: string | null) => void;
  setMode: (mode: "schedule" | "availability") => void;
  openScheduleModal: (selection?: DraftSelection | null, item?: ScheduleItem | null) => void;
  closeScheduleModal: () => void;
  setCreateProjectOpen: (open: boolean) => void;
  setAddDateOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  selectedDateId: null,
  selectedScheduleId: "s-2",
  activeMode: "schedule",
  draftSelection: null,
  isCreateProjectOpen: false,
  isAddDateOpen: false,
  isShareOpen: false,
  isScheduleModalOpen: false,
  setSelectedDate: (id) => set({ selectedDateId: id }),
  setSelectedSchedule: (id) => set({ selectedScheduleId: id }),
  setMode: (mode) => set({ activeMode: mode }),
  openScheduleModal: (selection, item) =>
    set({
      draftSelection: selection ?? null,
      selectedScheduleId: item?.id ?? null,
      isScheduleModalOpen: true
    }),
  closeScheduleModal: () => set({ isScheduleModalOpen: false, draftSelection: null }),
  setCreateProjectOpen: (open) => set({ isCreateProjectOpen: open }),
  setAddDateOpen: (open) => set({ isAddDateOpen: open }),
  setShareOpen: (open) => set({ isShareOpen: open })
}));
