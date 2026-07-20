import Link from "next/link";
import { CalendarRange, MousePointerClick, Share2, Users } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: MousePointerClick,
    title: "드래그로 일정 추가",
    body: "시간표를 드래그하면 바로 일정이 생겨요. 복잡한 입력 없이 즉시 시작."
  },
  {
    icon: CalendarRange,
    title: "필요한 날짜만",
    body: "일주일 틀이나 여행·MT 기간처럼, 원하는 날짜만 골라 시간표를 만들어요."
  },
  {
    icon: Users,
    title: "함께 편집",
    body: "링크 하나로 초대하면 같은 시간표를 함께 채워나갈 수 있어요."
  },
  {
    icon: Share2,
    title: "링크로 공유",
    body: "PNG·PDF로 내보내거나 링크만 보내 누구에게나 보여줄 수 있어요."
  }
];

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
  const loggedIn = Boolean(user);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6">
        <span className="text-lg font-semibold">📅 PlanTogether</span>
        <nav className="flex items-center gap-2">
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
          >
            {loggedIn ? "대시보드" : "로그인"}
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-3xl px-5 pb-16 pt-16 text-center sm:pt-24">
        <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          함께 만드는
          <br className="sm:hidden" /> 공유 시간표
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-muted sm:text-lg">
          드래그로 만들고 링크 하나로 공유하세요. 여행·MT·스터디·프로젝트까지, 필요한 날짜만 골라 함께
          채우는 시간표.
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href={loggedIn ? "/dashboard" : "/login"}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 sm:w-auto"
          >
            {loggedIn ? "내 시간표로 이동" : "무료로 시작하기"}
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 pb-24">
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="rounded-xl border border-border bg-card p-6">
              <feature.icon className="text-primary" size={22} />
              <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-5 py-6 text-sm text-muted sm:flex-row">
          <span>© PlanTogether</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="transition hover:text-foreground">
              개인정보처리방침
            </Link>
            <Link href={loggedIn ? "/dashboard" : "/login"} className="transition hover:text-foreground">
              {loggedIn ? "대시보드" : "로그인"}
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
