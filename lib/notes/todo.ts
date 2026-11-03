/**
 * A to-do is a note whose text starts with a checklist mark, "[ ] " or
 * "[x] " — the same shorthand GitHub and Notion read. Kept in the body
 * rather than a column, so to-dos sync, reorder and delete as notes already
 * do, with no schema change.
 */
const TODO_MARK = /^\[( |x)\] /i;

export type ParsedNote = { kind: "note" | "todo"; done: boolean; text: string };

export function parseNote(body: string): ParsedNote {
  const match = body.match(TODO_MARK);
  if (!match) return { kind: "note", done: false, text: body };
  return { kind: "todo", done: match[1].toLowerCase() === "x", text: body.slice(match[0].length) };
}

export function todoBody(text: string, done: boolean) {
  return `[${done ? "x" : " "}] ${text}`;
}

/** How a note reads outside the app (exports): a box instead of brackets. */
export function noteForExport(body: string) {
  const note = parseNote(body);
  return note.kind === "todo" ? `${note.done ? "☑" : "☐"} ${note.text}` : body;
}
