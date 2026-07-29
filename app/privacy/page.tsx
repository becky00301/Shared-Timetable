"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale";

type Section = { title: string; body: string[] };

const SECTIONS_KO: Section[] = [
  {
    title: "1. 수집하는 개인정보 항목",
    body: [
      "회원가입 시: 이메일 주소, 비밀번호(단방향 암호화되어 저장되며 운영자도 원문을 볼 수 없습니다).",
      "서비스 이용 시: 이용자가 작성한 시간표 정보(시간표 이름·설명, 선택한 날짜, 일정 제목·시간·장소·메모, 자유 메모), 참여자 및 권한 정보.",
      "구글 캘린더 연동을 사용하는 경우: 구글 계정 이메일과 캘린더 접근 토큰. 이 기능은 이용자가 직접 연결을 눌렀을 때만 동작하며, 언제든 연결을 해제할 수 있습니다.",
      "서비스 이용 과정에서 접속 로그, 쿠키, 기기·브라우저 정보가 자동으로 생성·수집될 수 있습니다."
    ]
  },
  {
    title: "2. 수집·이용 목적",
    body: ["회원 식별 및 로그인 유지", "시간표 작성·공유·협업 기능 제공", "서비스 오류 파악 및 개선"]
  },
  {
    title: "3. 보유 및 이용 기간",
    body: [
      "회원 탈퇴 또는 이용자의 삭제 요청 시 해당 정보를 지체 없이 파기합니다.",
      "시간표를 삭제하면 그에 속한 날짜·일정·메모도 함께 삭제됩니다.",
      "관계 법령에 따라 별도 보관이 필요한 경우 해당 기간 동안 보관합니다."
    ]
  },
  {
    title: "4. 개인정보 처리 위탁",
    body: [
      "Supabase — 데이터베이스 및 인증 관리",
      "Vercel — 서비스 호스팅 및 배포",
      "Google — 이용자가 구글 캘린더 연동을 사용할 경우 일정 정보 전송",
      "위 수탁업체는 서비스 제공에 필요한 범위에서만 정보를 처리하며, 해외 서버에 데이터가 저장·처리될 수 있습니다."
    ]
  },
  {
    title: "5. 제3자 제공",
    body: [
      "회사는 이용자의 개인정보를 제3자에게 판매하거나 제공하지 않습니다.",
      "다만 이용자가 시간표를 공유하거나 초대 링크로 다른 이용자를 초대한 경우, 해당 시간표의 내용과 참여자 이메일은 그 시간표 참여자에게 공개됩니다.",
      "법령에 따라 수사기관 등의 적법한 요구가 있는 경우에는 관련 절차에 따라 제공될 수 있습니다."
    ]
  },
  {
    title: "6. 쿠키 및 분석 도구",
    body: [
      "로그인 상태 유지를 위해 필수 쿠키를 사용합니다.",
      "서비스 이용 현황 분석을 위해 Google Tag Manager 기반의 분석 도구가 사용될 수 있으며, 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다."
    ]
  },
  {
    title: "7. 이용자의 권리",
    body: [
      "이용자는 언제든지 자신의 개인정보를 조회·수정·삭제하거나 처리 정지를 요청할 수 있습니다.",
      "계정 삭제 또는 문의는 아래 연락처로 요청해 주세요."
    ]
  }
];

const SECTIONS_EN: Section[] = [
  {
    title: "1. Personal data we collect",
    body: [
      "At sign-up: your email address and password (stored one-way encrypted; even the operator cannot read the original).",
      "While using the service: the timetables you create (name and description, selected dates, schedule titles, times, locations and notes, free-form notes) and member and role information.",
      "If you use Google Calendar sync: your Google account email and a calendar access token. This runs only when you click to connect, and you can disconnect at any time.",
      "Access logs, cookies, and device/browser information may be generated and collected automatically while you use the service."
    ]
  },
  {
    title: "2. Why we use it",
    body: [
      "To identify members and keep you logged in",
      "To provide timetable creation, sharing, and collaboration",
      "To detect and fix errors and improve the service"
    ]
  },
  {
    title: "3. Retention period",
    body: [
      "When you delete your account or request deletion, the data is destroyed without delay.",
      "Deleting a timetable also deletes its dates, schedules, and notes.",
      "Where a law requires separate retention, the data is kept for that period."
    ]
  },
  {
    title: "4. Processing entrusted to others",
    body: [
      "Supabase — database and authentication",
      "Vercel — hosting and deployment",
      "Google — sending schedule data when you use Google Calendar sync",
      "These processors handle data only as needed to provide the service, and data may be stored and processed on overseas servers."
    ]
  },
  {
    title: "5. Sharing with third parties",
    body: [
      "We do not sell or provide your personal data to third parties.",
      "However, if you share a timetable or invite others with an invite link, that timetable's contents and members' emails are visible to its participants.",
      "Where lawfully required by investigative authorities, data may be provided following the applicable procedures."
    ]
  },
  {
    title: "6. Cookies and analytics",
    body: [
      "We use essential cookies to keep you logged in.",
      "Analytics based on Google Tag Manager may be used to understand usage; you can refuse cookie storage in your browser settings."
    ]
  },
  {
    title: "7. Your rights",
    body: [
      "You can view, correct, delete, or request a halt to the processing of your personal data at any time.",
      "For account deletion or questions, contact us at the address below."
    ]
  }
];

const COPY = {
  ko: {
    back: "← 플래너 투게더",
    title: "개인정보처리방침",
    intro:
      "플래너 투게더(이하 “서비스”)는 이용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다.",
    contactTitle: "8. 문의처",
    contact: "개인정보 관련 문의: becky00301@gmail.com",
    footer: "본 방침은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시 이 페이지를 통해 공지합니다.",
    sections: SECTIONS_KO
  },
  en: {
    back: "← Planner Together",
    title: "Privacy Policy",
    intro:
      "Planner Together (the “Service”) treats your personal data with care and complies with applicable law.",
    contactTitle: "8. Contact",
    contact: "Privacy inquiries: becky00301@gmail.com",
    footer:
      "This policy may change as the service evolves; any changes will be announced on this page.",
    sections: SECTIONS_EN
  }
} as const;

export default function PrivacyPage() {
  const { locale } = useLocale();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-12">
        <Link href="/" className="text-sm text-muted transition hover:text-foreground">
          {copy.back}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted">{copy.intro}</p>

        <div className="mt-10 flex flex-col gap-8">
          {copy.sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-semibold">{section.title}</h2>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-7 text-muted">
                {section.body.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ))}

          <section>
            <h2 className="text-lg font-semibold">{copy.contactTitle}</h2>
            <p className="mt-3 text-sm leading-7 text-muted">{copy.contact}</p>
          </section>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs leading-6 text-muted">{copy.footer}</p>
      </div>
    </main>
  );
}
