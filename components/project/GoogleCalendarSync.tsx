"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n/locale";

type Status = { configured: boolean; connected: boolean; email: string | null };

export function GoogleCalendarSync({ projectId }: { projectId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<Status | null>(null);
  const [syncing, setSyncing] = useState(false);
  const { t, locale } = useLocale();

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
      toast.success(t("google.connected"));
      loadStatus();
    } else if (googleParam === "not-configured") {
      toast.error(t("google.noServerConfig"));
    } else {
      toast.error(t("google.connectFailed", { reason: googleParam }));
    }
    router.replace(pathname);
  }, [googleParam, loadStatus, pathname, router, t]);

  if (!status?.configured) return null;

  async function sync() {
    setSyncing(true);
    try {
      const response = await fetch("/api/google/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, locale })
      });
      const data = (await response.json()) as {
        error?: string;
        created?: number;
        updated?: number;
      };
      if (!response.ok) throw new Error(data.error || t("google.syncFailed"));
      toast.success(t("google.syncDone", { created: data.created ?? 0, updated: data.updated ?? 0 }));
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : t("google.syncFailed"));
    } finally {
      setSyncing(false);
    }
  }

  async function disconnect() {
    try {
      await fetch("/api/google/status", { method: "DELETE" });
      toast.success(t("google.disconnected"));
      loadStatus();
    } catch (error) {
      console.error(error);
      toast.error(t("google.disconnectFailed"));
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
        {t("google.connect")}
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="outline" size="sm" className="w-full" disabled={syncing} onClick={sync}>
        <RefreshCw size={15} className={syncing ? "animate-spin" : undefined} />
        {syncing ? t("google.syncing") : t("google.push")}
      </Button>
      <p className="text-xs leading-5 text-muted">
        {t("google.connectedTo", { email: status.email ?? t("google.account") })} ·{" "}
        <button type="button" onClick={disconnect} className="underline transition hover:text-foreground">
          {t("google.disconnect")}
        </button>
      </p>
    </div>
  );
}
