"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocale, useT } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils/cn";
import { MAX_MESSAGE_LENGTH, useLiveChat } from "@/lib/supabase/chat";
import { useProjectStore } from "@/stores/project-store";
import type { ProjectMember } from "@/types/project";

/** Fires only when the user isn't typing somewhere — the same guard the
    Delete and Cmd+Z handlers already use. */
function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.isContentEditable ||
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT"
  );
}

export function LiveChatPanel({
  projectId,
  members
}: {
  projectId: string;
  members: ProjectMember[];
}) {
  const currentUserId = useProjectStore((state) => state.currentUserId);
  const { locale } = useLocale();
  const t = useT();

  const me = members.find((member) => member.user_id === currentUserId);
  const { messages, send, connected } = useLiveChat({
    projectId,
    userId: currentUserId,
    name: me?.user?.name || me?.user?.email?.split("@")[0] || t("role.viewer")
  });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // "/" opens the panel from anywhere on the page, Escape closes it. Bare key
  // only: Cmd+/ and friends stay available to the browser.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        setOpen(false);
        return;
      }
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      inputRef.current?.focus();
    }
  }, [open]);

  // Count what arrived while the panel was shut. Own messages never count.
  const lastSeenCount = useRef(messages.length);
  useEffect(() => {
    const added = messages.length - lastSeenCount.current;
    lastSeenCount.current = messages.length;
    if (added > 0 && !open && !messages[messages.length - 1]?.mine) {
      setUnread((prev) => prev + added);
    }
  }, [messages, open]);

  // Pin to the newest line, before paint so it never shows the jump.
  useLayoutEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open]);

  const timeFormat = new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    hour: "numeric",
    minute: "2-digit"
  });

  function submitDraft() {
    if (send(draft)) setDraft("");
  }

  if (!currentUserId) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("chat.open")}
        title={t("chat.openHint")}
        className="fixed bottom-[4.5rem] right-4 z-30 inline-flex size-11 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-glow transition hover:border-primary hover:text-primary"
      >
        <MessageCircle size={18} />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 flex h-[min(420px,calc(100vh-32px))] w-[min(340px,calc(100vw-24px))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-semibold text-foreground">{t("chat.title")}</h2>
          <span
            className={cn(
              "size-1.5 rounded-full",
              connected ? "bg-emerald-500" : "bg-black/20"
            )}
            aria-hidden
          />
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-muted transition hover:bg-black/8 hover:text-foreground"
          aria-label={t("common.close")}
        >
          <X size={16} />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2">
        {messages.length ? (
          <div className="flex flex-col gap-2">
            {messages.map((message, index) => {
              // Collapse the name on a run from the same person, the way a
              // chat app does, so the column stays readable.
              const previous = messages[index - 1];
              const grouped = previous?.userId === message.userId;
              return (
                <div key={message.id} className={cn(grouped && "-mt-1.5")}>
                  {grouped ? null : (
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: message.color }}
                        aria-hidden
                      />
                      <span className="truncate text-[11px] font-medium text-foreground">
                        {message.mine ? t("chat.you") : message.name}
                      </span>
                      <span className="shrink-0 text-[10px] tabular-nums text-muted">
                        {timeFormat.format(message.at)}
                      </span>
                    </div>
                  )}
                  <p className="ml-3.5 whitespace-pre-wrap break-words text-xs leading-5 text-foreground">
                    {message.body}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="px-2 py-6 text-center text-xs leading-5 text-muted">{t("chat.empty")}</p>
        )}
      </div>

      <form
        className="flex items-center gap-1.5 border-t border-border p-2"
        onSubmit={(event) => {
          event.preventDefault();
          submitDraft();
        }}
      >
        <Input
          ref={inputRef}
          value={draft}
          maxLength={MAX_MESSAGE_LENGTH}
          className="h-9 text-sm"
          placeholder={connected ? t("chat.placeholder") : t("chat.connecting")}
          disabled={!connected}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Hangul commits a syllable with Enter, and that same Enter would
            // trigger the form's implicit submission — sending half a word.
            // Sending explicitly behind this guard is the only way to tell the
            // two Enters apart.
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              submitDraft();
            }
          }}
        />
        <button
          type="submit"
          disabled={!connected || !draft.trim()}
          aria-label={t("chat.send")}
          className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-black/8 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </aside>
  );
}
