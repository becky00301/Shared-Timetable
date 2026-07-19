"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Status = { configured: boolean; connected: boolean; email: string | null };

export function GoogleCalendarSync({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/google/status", { cache: "no-store" });
      setStatus((await response.json()) as Status);
    } catch (error) {
      console.error(error);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // The OAuth callback returns here with ?google=...
  const googleParam = searchParams.get("google");
  useEffect(() => {
    if (!googleParam) return;
    if (googleParam === "connected") {
      toast.success("구글 캘린더를 연결했어요.");
      loadStatus();
    } else if (googleParam === "not-configured") {
      toast.error("서버에 구글 설정이 없어요.");
    } else {
      toast.error(`구글 연결에 실패했어요: ${googleParam}`);
    }
    router.replace(pathname);
  }, [googleParam, loadStatus, pathname, router]);

  if (!status?.configured) return null;

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId })
      });
      const data = (await response.json()) as {
        error?: string;
        created?: number;
        updated?: number;
      };
      if (!response.ok) throw new Error(data.error || "동기화에 실패했어요.");
      toast.success(`구글 캘린더에 반영했어요. (추가 ${data.created ?? 0} · 수정 ${data.updated ?? 0})`);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "동기화에 실패했어요.");
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    try {
      await fetch("/api/google/status", { method: "DELETE" });
      toast.success("구글 캘린더 연결을 해제했어요.");
      loadStatus();
    } catch (error) {
      console.error(error);
      toast.error("연결 해제에 실패했어요.");
    }
  }

  if (!status.connected) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          window.location.href = `/api/google/connect?next=${encodeURIComponent(pathname)}`;
        }}
      >
        <CalendarCheck size={15} />
        구글 캘린더 연결
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" className="w-full" disabled={syncing} onClick={sync}>
        <RefreshCw size={15} className={syncing ? "animate-spin" : undefined} />
        {syncing ? "동기화 중..." : "구글 캘린더로 보내기"}
      </Button>
      <p className="text-xs leading-5 text-muted">
        {status.email ?? "구글 계정"}에 연결됨 ·{" "}
        <button type="button" onClick={disconnect} className="underline transition hover:text-foreground">
          해제
        </button>
      </p>
    </div>
  );
}
