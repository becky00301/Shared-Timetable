"use client";

import { useRef, useState } from "react";
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
import { Check, GripVertical, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useContextMenu, useLongPress } from "@/components/ui/context-menu";
import { Textarea } from "@/components/ui/input";
import { LinkPreviewCard, LinkTitle, splitUrls } from "@/components/project/LinkPreviewCard";
import { useT } from "@/lib/i18n/locale";
import { parseNote, todoBody } from "@/lib/notes/todo";
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
  // What the next entry becomes: a plain note or a to-do with a checkbox.
  const [kind, setKind] = useState<"note" | "todo">("note");
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
      await addNote(projectId, kind === "todo" ? todoBody(body, false) : body);
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
            placeholder={t(kind === "todo" ? "notes.todoPlaceholder" : "notes.placeholder")}
            className="min-h-16 rounded-none border-0 bg-transparent text-sm focus:border-transparent focus:ring-0"
          />
          {/* The note/to-do choice sits beside the add button, the last thing
              settled before sending. */}
          <div className="flex items-center justify-between gap-2 px-2 pb-2">
            <div
              role="radiogroup"
              aria-label={t("notes.kind.label")}
              className="inline-grid grid-cols-2 gap-0.5 rounded-[8px] bg-black/[0.05] p-0.5"
            >
              {(["note", "todo"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={kind === option}
                  onClick={() => setKind(option)}
                  className={cn(
                    "rounded-[6px] px-2.5 py-1 text-xs transition",
                    kind === option
                      ? "bg-background font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {t(option === "todo" ? "notes.kind.todo" : "notes.kind.note")}
                </button>
              ))}
            </div>
            <Button type="submit" size="sm" disabled={!draft.trim() || saving || reordering}>
              <Plus size={15} />
              {saving ? t("notes.adding") : t(kind === "todo" ? "notes.addTodo" : "notes.add")}
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
  const cancelled = useRef(false);
  const t = useT();
  const disabled = !canEdit || busy || editing;
  const note = parseNote(body);
  const parts = splitUrls(note.text);
  const urls = parts.filter((part) => part.kind === "url").map((part) => part.value);
  // One link gets a picture card below the note; several each get a title
  // line beneath them, in the text.
  const cardUrl = urls.length === 1 ? urls[0] : null;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging, transform, transition } = useSortable({
    id,
    disabled,
    transition: { duration: 180, easing: "cubic-bezier(0.25, 1, 0.5, 1)" }
  });

  function beginEdit() {
    if (!canEdit || busy || isDragging) return;
    cancelled.current = false;
    setValue(note.text);
    setEditing(true);
  }

  // On a phone a long press offers edit or delete; a right-click on a
  // computer still goes straight to editing.
  const { openAt, menu } = useContextMenu(
    canEdit
      ? [
          { label: t("common.edit"), onSelect: beginEdit },
          { label: t("common.delete"), onSelect: onDelete, danger: true }
        ]
      : []
  );
  const longPress = useLongPress(openAt, canEdit && !busy && !editing);

  async function save() {
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    const next = value.trim();
    // A to-do keeps its mark and checked state through an edit of its text.
    const nextBody = note.kind === "todo" ? todoBody(next, note.done) : next;
    if (!next || nextBody === body) {
      setValue(note.text);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(nextBody);
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
        // Android reports a long press as a context menu too.
        if (window.matchMedia("(pointer: coarse)").matches) openAt(event.clientX, event.clientY);
        else beginEdit();
      }}
      className={cn(
        "group flex flex-wrap items-start gap-1 rounded-lg border border-border bg-black/[0.02] px-2.5 py-2",
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
              setValue(note.text);
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
          {note.kind === "todo" ? (
            <button
              type="button"
              disabled={!canEdit || busy}
              onClick={() => void onSave(todoBody(note.text, !note.done)).catch(() => {})}
              aria-pressed={note.done}
              aria-label={t(note.done ? "notes.markUndone" : "notes.markDone")}
              title={t(note.done ? "notes.markUndone" : "notes.markDone")}
              className={cn(
                "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition disabled:cursor-default",
                note.done
                  ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)]"
                  : "border-black/25 bg-background hover:border-[var(--accent)]"
              )}
            >
              {note.done ? <Check size={11} strokeWidth={3} aria-hidden /> : null}
            </button>
          ) : null}
          {/* Not a <button>: links inside it must stay clickable, which a
              button can't contain. Keyboard and touch behave as before. */}
          <div
            role="button"
            tabIndex={!canEdit || busy ? -1 : 0}
            aria-disabled={!canEdit || busy}
            onMouseDown={(event) => listeners?.onMouseDown?.(event)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === "F2" || event.key === " ") {
                event.preventDefault();
                beginEdit();
              }
            }}
            {...longPress}
            className={cn(
              "min-w-0 flex-1 whitespace-pre-wrap break-words text-left text-xs leading-5 text-foreground",
              // A held finger opens the menu, not the text selection.
              canEdit && "pointer-coarse:select-none pointer-coarse:[-webkit-touch-callout:none]",
              canEdit && !busy ? "cursor-grab active:cursor-grabbing" : "cursor-default",
              note.done && "text-muted line-through"
            )}
            title={canEdit ? t("notes.editHint") : undefined}
          >
            {urls.length > 1
              ? parts.map((part, index) =>
                  part.kind === "text" ? (
                    part.value
                  ) : (
                    <a
                      key={index}
                      href={part.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      // The link's own: no edit, drag or edit menu from it.
                      onMouseDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      onContextMenu={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      className="break-all text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {part.value}
                      <LinkTitle url={part.value} />
                    </a>
                  )
                )
              : note.text}
          </div>
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
          {/* A link in the note shows as its page's preview card, on its own
              line beneath the text. */}
          {cardUrl ? (
            <div className="mt-1 basis-full">
              <LinkPreviewCard url={cardUrl} />
            </div>
          ) : null}
        </>
      )}
      {menu}
    </div>
  );
}
