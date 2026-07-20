"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Plus, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useProjectStore } from "@/stores/project-store";
import { useUiStore } from "@/stores/ui-store";
import type { ProjectDay } from "@/types/project";

export function NotesView({
  projectId,
  days,
  canEdit
}: {
  projectId: string;
  days: ProjectDay[];
  canEdit: boolean;
}) {
  const schedules = useProjectStore((state) => state.schedules);
  const notes = useProjectStore((state) => state.notes).filter((note) => note.project_id === projectId);
  const addNote = useProjectStore((state) => state.addNote);
  const updateNote = useProjectStore((state) => state.updateNote);
  const deleteNote = useProjectStore((state) => state.deleteNote);
  const setSelectedSchedule = useUiStore((state) => state.setSelectedSchedule);
  const setViewMode = useUiStore((state) => state.setViewMode);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  // Schedule memos grouped by the day they belong to.
  const byDay = useMemo(
    () =>
      days.map((day) => ({
        day,
        items: schedules
          .filter((item) => item.day_id === day.id && (item.description?.trim() || item.location?.trim()))
          .sort((a, b) => a.start_time.localeCompare(b.start_time))
      })),
    [days, schedules]
  );

  const hasScheduleMemos = byDay.some((group) => group.items.length > 0);
  const daysWithNote = days.filter((day) => day.note?.trim());

  async function submitNote(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSaving(true);
    try {
      await addNote(projectId, body);
      setDraft("");
    } catch (error) {
      console.error(error);
      toast.error("메모를 추가하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-background p-5">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <StickyNote size={16} className="text-primary" />
            메모
          </h2>

          {canEdit ? (
            <form className="mt-3 flex flex-col gap-2" onSubmit={submitNote}>
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="일정과 상관없는 메모를 자유롭게 적어보세요. (준비물, 예산, 링크 등)"
              />
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={!draft.trim() || saving}>
                  <Plus size={15} />
                  {saving ? "추가 중..." : "메모 추가"}
                </Button>
              </div>
            </form>
          ) : null}

          <div className="mt-3 flex flex-col gap-2">
            {notes.length ? (
              notes.map((note) => (
                <NoteRow
                  key={note.id}
                  body={note.body}
                  canEdit={canEdit}
                  onSave={(body) =>
                    updateNote(note.id, body).catch((error) => {
                      console.error(error);
                      toast.error("메모를 저장하지 못했어요.");
                    })
                  }
                  onDelete={() =>
                    deleteNote(note.id)
                      .then(() => toast.success("메모를 삭제했어요."))
                      .catch((error) => {
                        console.error(error);
                        toast.error("메모를 삭제하지 못했어요.");
                      })
                  }
                />
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
                아직 메모가 없어요.
              </p>
            )}
          </div>
        </section>

        {daysWithNote.length ? (
          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays size={16} className="text-primary" />
              날짜별 종일 메모
            </h2>
            <div className="mt-3 flex flex-col gap-2">
              {daysWithNote.map((day) => (
                <div key={day.id} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs text-muted">{day.date}</p>
                  <p className="mt-1 text-sm leading-6 text-foreground">{day.note}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays size={16} className="text-primary" />
            일정에 적은 메모
          </h2>
          {hasScheduleMemos ? (
            <div className="mt-3 flex flex-col gap-4">
              {byDay
                .filter((group) => group.items.length > 0)
                .map(({ day, items }) => (
                  <div key={day.id}>
                    <p className="text-xs font-medium text-muted">{day.date}</p>
                    <div className="mt-2 flex flex-col gap-2">
                      {items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setSelectedSchedule(item.id);
                            setViewMode("grid");
                          }}
                          className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: item.color ?? "#2383e2" }}
                            />
                            <span className="text-sm font-medium text-foreground">{item.title}</span>
                            <span className="text-xs text-muted">
                              {item.start_time.slice(0, 5)} – {item.end_time.slice(0, 5)}
                            </span>
                          </div>
                          {item.location?.trim() ? (
                            <p className="mt-1 text-xs text-muted">📍 {item.location}</p>
                          ) : null}
                          {item.description?.trim() ? (
                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                              {item.description}
                            </p>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted">
              일정 상세에서 메모를 적으면 여기에 모여요.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function NoteRow({
  body,
  canEdit,
  onSave,
  onDelete
}: {
  body: string;
  canEdit: boolean;
  onSave: (body: string) => void;
  onDelete: () => void;
}) {
  const [value, setValue] = useState(body);

  return (
    <div className="flex items-start gap-2 rounded-xl border border-border bg-card p-3">
      {canEdit ? (
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={() => {
            const next = value.trim();
            if (!next || next === body) {
              setValue(body);
              return;
            }
            onSave(next);
          }}
          className="min-h-16 border-none bg-transparent focus:ring-0"
        />
      ) : (
        <p className="flex-1 whitespace-pre-wrap text-sm leading-6 text-foreground">{body}</p>
      )}
      {canEdit ? (
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label="메모 삭제">
          <Trash2 size={15} />
        </Button>
      ) : null}
    </div>
  );
}
