"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";

/** Collapse state is per timetable: a guest with several timetables needs the
    warning available for each link they have to keep. */
const collapseKey = (slug: string) => `plantogether.guestBannerDismissed.${slug}`;

export function GuestLinkBanner({ slug }: { slug: string }) {
  const isGuest = useProjectStore((state) => state.isGuest);
  const [collapsed, setCollapsed] = useState<boolean | null>(null);
  const t = useT();
  const bodyId = `guest-link-banner-${slug}`;

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(collapseKey(slug)) === "1");
  }, [slug]);

  if (!isGuest || collapsed === null) return null;

  function toggleCollapsed() {
    const next = !collapsed;
    window.localStorage.setItem(collapseKey(slug), next ? "1" : "0");
    setCollapsed(next);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    toast.success(t("share.copied"));
  }

  return (
    <div className="editor-only flex flex-col gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 sm:flex-row sm:items-start">
      <TriangleAlert size={18} className="mt-0.5 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">{t("guest.banner.title")}</p>
        {collapsed ? null : (
          <p id={bodyId} className="mt-1 text-xs leading-5 text-amber-800">
            {t("guest.banner.body")}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {collapsed ? null : (
          <>
            {/* Converting a guest to an account is worth more than them
                bookmarking the link, so signup carries the primary weight. */}
            <Button size="sm" asChild>
              <Link href="/login">{t("guest.banner.signup")}</Link>
            </Button>
            <Button size="sm" variant="outline" onClick={copyLink}>
              <Copy size={14} />
              {t("guest.banner.copy")}
            </Button>
          </>
        )}
        <Button
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 rounded-sm"
          onClick={toggleCollapsed}
          aria-expanded={!collapsed}
          aria-controls={bodyId}
          aria-label={collapsed ? t("guest.banner.expand") : t("guest.banner.collapse")}
        >
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </Button>
      </div>
    </div>
  );
}
