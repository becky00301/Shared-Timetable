"use client";

import Image from "next/image";
import Link from "next/link";
import { LegalPageHeader } from "@/components/layout/LegalPageHeader";
import { useLocale } from "@/lib/i18n/locale";
import { RELEASES, formatReleaseDate } from "@/lib/updates";
import { cn } from "@/lib/utils/cn";

const COPY = {
  ko: {
    back: "뒤로",
    title: "업데이트 소식",
    intro: "플래너 투게더에 새로 생긴 기능과 달라진 점이에요. 써보고 의견이 있으면 언제든 알려주세요.",
    start: "시간표 만들러 가기",
    contact: "의견 보내기"
  },
  en: {
    back: "Back",
    title: "What's new",
    intro: "New features and changes in Planner Together. Tell us what you think any time.",
    start: "Make a timetable",
    contact: "Send feedback"
  }
};

export default function UpdatesPage() {
  const { locale } = useLocale();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LegalPageHeader backLabel={copy.back} />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{copy.intro}</p>

        <div className="mt-10 flex flex-col gap-12">
          {RELEASES.map((release) => (
            <section key={release.date} aria-labelledby={`release-${release.date}`}>
              <h2 id={`release-${release.date}`} className="border-b border-border pb-2 text-sm font-semibold text-muted">
                <time dateTime={release.date}>{formatReleaseDate(release.date, locale)}</time>
              </h2>
              <ul className="mt-5 flex flex-col gap-5">
                {release.changes.map((change) => {
                  const text = change[locale];
                  return (
                    <li key={text.title}>
                      <p className="text-base font-semibold">{text.title}</p>
                      <p className="mt-1 text-sm leading-7 text-muted">{text.body}</p>
                      {change.image ? (
                        <Image
                          src={change.image.src}
                          width={change.image.width}
                          height={change.image.height}
                          alt={text.title}
                          sizes={change.image.phone ? "280px" : "(max-width: 768px) 100vw, 720px"}
                          className={cn(
                            "mt-3 h-auto rounded-xl border border-border",
                            change.image.phone ? "w-full max-w-[280px]" : "w-full"
                          )}
                        />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap gap-x-5 gap-y-2 border-t border-border pt-6 text-sm text-muted">
          <Link href="/dashboard" className="underline underline-offset-2 hover:text-foreground">{copy.start}</Link>
          <a href="mailto:becky00301@gmail.com" className="underline underline-offset-2 hover:text-foreground">{copy.contact}</a>
        </div>
      </div>
    </main>
  );
}
