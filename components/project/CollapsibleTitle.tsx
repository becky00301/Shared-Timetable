"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const STORAGE_KEY = "plantogether.sidebar.collapsed";

function readCollapsed(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Which sidebar panels are folded, remembered in this browser so a panel
 * someone closed stays closed on their next visit and on other timetables.
 */
export function useCollapsedPanels() {
  const [collapsed, setCollapsed] = useState<string[]>([]);
  useEffect(() => setCollapsed(readCollapsed()), []);
  const toggle = useCallback((id: string) => {
    setCollapsed((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Folding still works for this visit.
      }
      return next;
    });
  }, []);
  return { isCollapsed: (id: string) => collapsed.includes(id), toggle };
}

/** A panel's title as its fold toggle: the chevron turns to show the state. */
export function CollapsibleTitle({
  title,
  collapsed,
  onToggle
}: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={!collapsed}
      className="-mx-1 flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 text-left transition hover:bg-black/[0.05]"
    >
      <ChevronDown
        size={13}
        aria-hidden
        className={cn("shrink-0 text-muted transition-transform", collapsed && "-rotate-90")}
      />
      <h2 className="truncate text-xs font-semibold text-muted">{title}</h2>
    </button>
  );
}
