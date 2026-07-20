"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useProjectStore } from "@/stores/project-store";

export function SidebarNotes({ projectId, canEdit }: { projectId: string; canEdit: boolean }) {
  const notes = useProjectStore((state) => state.notes).filter((note) => note.project_id === projectId);
  const addNote = useProjectStore((state) => state.addNote);
  const updateNote = useProjectStore((state) => state.updateNote);
  const deleteNote = useProjectStore((state) => state.deleteNote);

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

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
      toast.error("메모를 추가하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {canEdit ? (
        <form className="flex flex-col gap-2" onSubmit={submit}>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="준비물, 예산, 링크 등"
            className="min-h-16 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!draft.trim() || saving}>
            <Plus size={15} />
            {saving ? "추가 중..." : "메모 추가"}
          </Button>
        </form>
      ) : null}

      {notes.length ? (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <SidebarNoteRow
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
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted">
          아직 메모가 없어요.
        </p>
      )}
    </div>
  );
}

function SidebarNoteRow({
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
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(body);

  if (editing && canEdit) {
    return (
      <Textarea
        autoFocus
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => {
          setEditing(false);
          const next = value.trim();
          if (!next || next === body) {
            setValue(body);
            return;
          }
          onSave(next);
        }}
        className="min-h-16 text-sm"
      />
    );
  }

  return (
    <div className="group flex items-start gap-1 rounded-lg border border-border bg-black/[0.02] px-2.5 py-2">
      <button
        type="button"
        disabled={!canEdit}
        onClick={() => {
          setValue(body);
          setEditing(true);
        }}
        className="flex-1 whitespace-pre-wrap break-words text-left text-xs leading-5 text-foreground disabled:cursor-default"
        title={canEdit ? "클릭해서 수정" : undefined}
      >
        {body}
      </button>
      {canEdit ? (
        <button
          type="button"
          onClick={onDelete}
          aria-label="메모 삭제"
          className="shrink-0 rounded p-1 text-muted opacity-0 transition hover:bg-red-500/10 hover:text-red-600 group-hover:opacity-100"
        >
          <Trash2 size={13} />
        </button>
      ) : null}
    </div>
  );
}
