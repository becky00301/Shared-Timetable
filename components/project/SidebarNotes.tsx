"use client";

import { useEffect, useRef, useState } from "react";
import {
  closestCenter,
  defaultDropAnimationSideEffects,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";

export function SidebarNotes({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const notes = useProjectStore((state) => state.notes)
    .filter((note) => note.project_id === projectId)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));
  const addNote = useProjectStore((state) => state.addNote);
  const updateNote = useProjectStore((state) => state.updateNote);
  const deleteNote = useProjectStore((state) => state.deleteNote);
  const reorderNotes = useProjectStore((state) => state.reorderNotes);
  const t = useT();

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [reordering, setReordering] = useState(false);
  const reorderPending = useRef(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeNote = notes.find((note) => note.id === activeId);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    try {
      await addNote(projectId, body);
      setDraft("");
    } catch (error) {
      console.error(error);
      toast.error(t("notes.addFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function moveNote(id: string, targetId: string) {
    if (!canEdit || reorderPending.current || id === targetId) return;
    const ids = notes.map((note) => note.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    reorderPending.current = true;
    setReordering(true);
    try {
      await reorderNotes(projectId, ids);
    } catch (error) {
      console.error(error);
      toast.error(t("notes.reorderFailed"));
    } finally {
      reorderPending.current = false;
      setReordering(false);
    }
  }

  function finishDrag({ active, over }: DragEndEvent) {
    setActiveId(null);
    if (over) void moveNote(String(active.id), String(over.id));
  }

  return (
    <div className="flex flex-col gap-2">
      {canEdit ? (
        <form
          className="rounded-lg border border-border bg-background transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20"
          onSubmit={submit}
        >
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("notes.placeholder")}
            className="min-h-16 rounded-none border-0 bg-transparent text-sm focus:border-transparent focus:ring-0"
          />
          <div className="flex justify-end px-2 pb-2">
            <Button type="submit" size="sm" disabled={!draft.trim() || saving || reordering}>
              <Plus size={15} />
              {saving ? t("notes.adding") : t("notes.add")}
            </Button>
          </div>
        </form>
      ) : null}

      {notes.length ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(String(active.id))}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={finishDrag}
        >
          <SortableContext items={notes.map((note) => note.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-2" aria-busy={reordering}>
              {notes.map((note, index) => (
                <SidebarNoteRow
                  key={note.id}
                  id={note.id}
                  body={note.body}
                  canEdit={canEdit}
                  busy={reordering}
                  onMove={(direction) => {
                    const target = notes[index + direction];
                    if (target) void moveNote(note.id, target.id);
                  }}
                  onSave={async (body) => {
                    try {
                      await updateNote(note.id, body);
                    } catch (error) {
                      console.error(error);
                      toast.error(t("notes.saveFailed"));
                      throw error;
                    }
                  }}
                  onDelete={() =>
                    deleteNote(note.id)
                      .then(() => toast.success(t("notes.deleted")))
                      .catch((error) => {
                        console.error(error);
                        toast.error(t("notes.deleteFailed"));
                      })
                  }
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay dropAnimation={{
            duration: 180,
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0" } } })
          }}>
            {activeNote ? (
              <div className="flex items-start gap-1 rounded-lg border border-border bg-background px-2.5 py-2 shadow-lg cursor-grabbing">
                <span className="mt-0.5 shrink-0 py-0.5 text-muted"><GripVertical size={14} /></span>
                <p className="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs leading-5 text-foreground">{activeNote.body}</p>
                <span className="shrink-0 p-1 invisible" aria-hidden="true"><Trash2 size={13} /></span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
          {t("notes.empty")}
        </p>
      )}
    </div>
  );
}

function SidebarNoteRow({
  id,
  body,
  canEdit,
  busy,
  onMove,
  onSave,
  onDelete
}: {
  id: string;
  body: string;
  canEdit: boolean;
  busy: boolean;
  onMove: (direction: -1 | 1) => void;
  onSave: (body: string) => Promise<void>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [value, setValue] = useState(body);
  const longPress = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchOrigin = useRef<{ x: number; y: number } | null>(null);
  const cancelled = useRef(false);
  const t = useT();
  const disabled = !canEdit || busy || editing;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging, transform, transition } = useSortable({
    id,
    disabled,
    transition: { duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }
  });

  function cancelLongPress() {
    if (longPress.current !== null) clearTimeout(longPress.current);
    longPress.current = null;
  }

  useEffect(() => () => {
    if (longPress.current !== null) clearTimeout(longPress.current);
  }, []);

  function beginEdit() {
    if (!canEdit || busy || isDragging) return;
    cancelLongPress();
    cancelled.current = false;
    setValue(body);
    setEditing(true);
  }

  async function save() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = value.trim();
    if (!next || next === body) {
      setValue(body);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // Keep the draft available when saving fails.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onContextMenu={(event) => {
        if (!canEdit || editing || busy) return;
        event.preventDefault();
        event.stopPropagation();
        beginEdit();
      }}
      className={cn(
        "group flex items-start gap-1 rounded-lg border border-border bg-black/[0.02] px-2.5 py-2",
        isDragging && "opacity-0"
      )}
    >
      {editing && canEdit ? (
        <Textarea
          autoFocus
          value={value}
          disabled={saving}
          aria-label={t("sidebar.notes")}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => { if (!saving) void save(); }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancelled.current = true;
              setValue(body);
              setEditing(false);
            }
            if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="min-h-16 text-sm"
        />
      ) : (
        <>
          {canEdit ? (
            <button
              ref={setActivatorNodeRef}
              type="button"
              {...attributes}
              {...listeners}
              disabled={disabled}
              aria-label={t("notes.reorderHint")}
              title={t("notes.reorderHint")}
              onKeyDown={(event) => {
                if (!isDragging && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                  event.preventDefault();
                  onMove(event.key === "ArrowUp" ? -1 : 1);
                } else {
                  listeners?.onKeyDown?.(event);
                }
              }}
              className="mt-0.5 shrink-0 touch-none rounded-sm py-0.5 text-muted cursor-grab active:cursor-grabbing disabled:cursor-default hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
            >
              <GripVertical size={14} />
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canEdit || busy}
            onMouseDown={(event) => listeners?.onMouseDown?.(event)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "F2" || event.key === " ") {
                event.preventDefault();
                beginEdit();
              }
            }}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (!touch || event.touches.length !== 1) return;
              touchOrigin.current = { x: touch.clientX, y: touch.clientY };
              cancelLongPress();
              longPress.current = setTimeout(beginEdit, 550);
            }}
            onTouchMove={(event) => {
              const touch = event.touches[0];
              if (!touch || !touchOrigin.current) return;
              if (Math.hypot(touch.clientX - touchOrigin.current.x, touch.clientY - touchOrigin.current.y) > 8) cancelLongPress();
            }}
            onTouchEnd={cancelLongPress}
            onTouchCancel={cancelLongPress}
            className="min-w-0 flex-1 whitespace-pre-wrap break-words text-left text-xs leading-5 text-foreground cursor-grab active:cursor-grabbing disabled:cursor-default"
            title={canEdit ? t("notes.editHint") : undefined}
          >
            {body}
          </button>
          {canEdit ? (
            <button
              type="button"
              onClick={onDelete}
              disabled={busy || isDragging}
              aria-label={t("notes.deleteLabel")}
              className="shrink-0 rounded-sm p-1 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
