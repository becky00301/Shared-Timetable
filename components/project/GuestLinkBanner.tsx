"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Copy, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/locale";
import { useProjectStore } from "@/stores/project-store";

/** Dismissal is per timetable: a guest with several timetables needs the
    warning once for each link they have to keep. */
const dismissKey = (slug: string) => `plantogether.guestBannerDismissed.${slug}`;

export function GuestLinkBanner({ slug }: { slug: string }) {
  const isGuest = useProjectStore((state) => state.isGuest);
  const [dismissed, setDismissed] = useState(true);
  const t = useT();

  useEffect(() => {
    setDismissed(window.localStorage.getItem(dismissKey(slug)) === "1");
  }, [slug]);

  if (!isGuest || dismissed) return null;

  function dismiss() {
    window.localStorage.setItem(dismissKey(slug), "1");
    setDismissed(true);
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
        <p className="mt-1 text-xs leading-5 text-amber-800">{t("guest.banner.body")}</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={copyLink}>
          <Copy size={14} />
          {t("guest.banner.copy")}
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/login">{t("guest.banner.signup")}</Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {t("guest.banner.dismiss")}
        </Button>
      </div>
    </div>
  );
}
