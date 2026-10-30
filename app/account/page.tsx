"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Trash2 } from "lucide-react";
import { ChangePasswordSection } from "@/components/account/ChangePasswordSection";
import { DeleteAccountSection } from "@/components/account/DeleteAccountSection";
import { AppShell } from "@/components/layout/AppShell";
import { useT } from "@/lib/i18n/locale";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { useProjectStore } from "@/stores/project-store";
import { getSocialOnlyProvider, isEmailLessNaverAccount, naverAccountLabel } from "@/lib/auth/social-account";
import type { User } from "@supabase/supabase-js";

type AccountMenu = "password" | "delete";

export default function AccountPage() {
  const router = useRouter();
  const t = useT();
  const [user, setUser] = useState<User | null>(null);
  const email = user?.email;
  const isNaver = isEmailLessNaverAccount(user);
  const socialProvider = getSocialOnlyProvider(user);
  const [activeMenu, setActiveMenu] = useState<AccountMenu>("password");

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.user) {
        router.replace("/login?next=%2Faccount");
        return;
      }
      if (data.user.is_anonymous) {
        const slug = await useProjectStore.getState().findGuestProjectSlug();
        if (cancelled) return;
        router.replace(slug ? `/plans/${slug}` : "/login");
        return;
      }
      setUser(data.user);
      if (new URLSearchParams(window.location.search).get("section") === "delete") setActiveMenu("delete");
    });

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-5 py-10">
        <header className="border-b border-border pb-7">
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-foreground">{t("account.page.title")}</h1>
          <p className="mt-2 text-muted">{t("account.page.subtitle")}</p>
          {email ? (
            <p className="mt-5 text-sm text-muted">
              {t("account.page.email")}
              <span className="ml-3 font-medium text-foreground">{email}</span>
            </p>
          ) : null}
          {isNaver && user ? (
            <p className="mt-5 text-sm text-muted">{naverAccountLabel(user.id)}</p>
          ) : null}
        </header>

        <div className="mt-7 border-b border-border">
          <div className="flex gap-6" role="tablist" aria-label={t("account.page.title")}>
            <button
              type="button"
              role="tab"
              aria-selected={activeMenu === "password"}
              aria-controls="account-panel"
              className={cn(
                "-mb-px flex h-12 items-center gap-2 border-b-2 px-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                activeMenu === "password"
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              )}
              onClick={() => setActiveMenu("password")}
            >
              <KeyRound size={16} />
              {socialProvider ? t("account.menu.security") : t("account.menu.password")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeMenu === "delete"}
              aria-controls="account-panel"
              className={cn(
                "-mb-px flex h-12 items-center gap-2 border-b-2 px-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                activeMenu === "delete"
                  ? "border-red-500 text-foreground"
                  : "border-transparent text-muted hover:text-foreground"
              )}
              onClick={() => setActiveMenu("delete")}
            >
              <Trash2 size={16} />
              {t("account.menu.delete")}
            </button>
          </div>
        </div>

        <div id="account-panel" role="tabpanel" className="py-8">
          {!user ? (
            <p className="text-sm text-muted">{t("common.loading")}</p>
          ) : activeMenu === "password" ? (
            socialProvider ? <p className="text-sm leading-6 text-muted">{t(socialProvider === "google" ? "account.google.security" : "account.naver.security")}</p>
              : email ? <ChangePasswordSection email={email} />
                : <p className="text-sm text-muted">{t("auth.error.generic")}</p>
          ) : (
            <DeleteAccountSection socialProvider={socialProvider} />
          )}
        </div>
      </main>
    </AppShell>
  );
}
