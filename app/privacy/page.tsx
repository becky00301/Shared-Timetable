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
      "계정 정보(이메일·이름·프로필 이미지): 회원 탈퇴 시까지 보유하며, 탈퇴 즉시 파기합니다.",
      "시간표 정보(시간표 이름·설명, 날짜, 일정, 메모): 해당 시간표를 삭제할 때까지 보유합니다. 시간표를 삭제하면 그에 속한 날짜·일정·메모도 함께 삭제됩니다.",
      "구글 캘린더 접근 토큰: 연동을 해제하거나 탈퇴할 때까지 보유하며, 해제 즉시 파기합니다.",
      "접속 로그·쿠키 등 자동 생성 정보: 서비스 운영 및 장애 대응에 필요한 기간 동안 보유합니다.",
      "관계 법령에서 별도의 보관 기간을 정한 경우에는 해당 기간 동안 보관한 뒤 파기합니다."
    ]
  },
  {
    title: "4. 파기 절차 및 방법",
    body: [
      "파기 절차: 회원 탈퇴, 시간표 삭제, 연동 해제 등 보유 목적이 달성되면 별도의 승인 절차 없이 즉시 삭제됩니다. 서비스 내 '회원 탈퇴' 기능으로 직접 처리할 수 있습니다.",
      "파기 방법: 데이터베이스에 저장된 전자적 파일은 복구할 수 없는 방법으로 삭제합니다. 종이 문서 형태로 보관하는 개인정보는 없습니다.",
      "탈퇴 시 계정 정보와 구글 연동 토큰, 본인만 참여 중이던 시간표는 함께 삭제됩니다.",
      "다른 참여자가 있는 시간표는 남은 참여자에게 소유권이 이전되어 유지되며, 이 경우 탈퇴한 이용자의 계정 정보는 해당 시간표에서 제거됩니다.",
      "백업 데이터에 남은 사본은 백업 보관 주기가 지나면 순차적으로 소멸됩니다."
    ]
  },
  {
    title: "5. 개인정보 처리 위탁",
    body: [
      "Supabase — 데이터베이스 및 인증 관리",
      "Vercel — 서비스 호스팅 및 배포",
      "Google — 이용자가 구글 캘린더 연동을 사용할 경우 일정 정보 전송",
      "위 수탁업체는 서비스 제공에 필요한 범위에서만 정보를 처리하며, 해외 서버에 데이터가 저장·처리될 수 있습니다."
    ]
  },
  {
    title: "6. 제3자 제공",
    body: [
      "회사는 이용자의 개인정보를 제3자에게 판매하거나 제공하지 않습니다.",
      "다만 이용자가 시간표를 공유하거나 초대 링크로 다른 이용자를 초대한 경우, 해당 시간표의 내용과 참여자 이메일은 그 시간표 참여자에게 공개됩니다.",
      "법령에 따라 수사기관 등의 적법한 요구가 있는 경우에는 관련 절차에 따라 제공될 수 있습니다."
    ]
  },
  {
    title: "7. 쿠키 및 분석 도구",
    body: [
      "로그인 상태 유지를 위해 필수 쿠키를 사용합니다.",
      "서비스 이용 현황 분석을 위해 Google Tag Manager 기반의 분석 도구가 사용될 수 있으며, 브라우저 설정에서 쿠키 저장을 거부할 수 있습니다."
    ]
  },
  {
    title: "8. 이용자의 권리",
    body: [
      "이용자는 언제든지 자신의 개인정보를 조회·수정·삭제하거나 처리 정지를 요청할 수 있습니다.",
      "회원 탈퇴는 로그인 후 마이페이지의 '회원 탈퇴' 메뉴에서 직접 처리할 수 있습니다.",
      "비밀번호를 잊은 경우 로그인 화면의 '비밀번호를 잊으셨나요?'에서 재설정 링크를 받을 수 있습니다.",
      "그 밖의 열람·정정·처리 정지 요청은 아래 보호책임자 연락처로 문의해 주세요."
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
      "Account data (email, name, profile image): kept until you close your account, then destroyed immediately.",
      "Timetable data (name and description, dates, schedules, notes): kept until you delete that timetable. Deleting a timetable also deletes its dates, schedules, and notes.",
      "Google Calendar access token: kept until you disconnect or close your account, then destroyed immediately.",
      "Automatically generated data such as access logs and cookies: kept for as long as needed to operate the service and respond to faults.",
      "Where a law sets its own retention period, the data is kept for that period and then destroyed."
    ]
  },
  {
    title: "4. How data is destroyed",
    body: [
      "Procedure: once the purpose is met — you close your account, delete a timetable, or disconnect an integration — the data is deleted immediately, with no separate approval step. You can do this yourself with the 'Close account' control in the app.",
      "Method: electronic records in the database are deleted irrecoverably. No personal data is held on paper.",
      "Closing your account also deletes your account data, your Google token, and any timetable you were the only member of.",
      "Timetables with other members are handed over to a remaining member and kept; your account data is removed from them.",
      "Copies left in backups age out as the backup retention cycle passes."
    ]
  },
  {
    title: "5. Processing entrusted to others",
    body: [
      "Supabase — database and authentication",
      "Vercel — hosting and deployment",
      "Google — sending schedule data when you use Google Calendar sync",
      "These processors handle data only as needed to provide the service, and data may be stored and processed on overseas servers."
    ]
  },
  {
    title: "6. Sharing with third parties",
    body: [
      "We do not sell or provide your personal data to third parties.",
      "However, if you share a timetable or invite others with an invite link, that timetable's contents and members' emails are visible to its participants.",
      "Where lawfully required by investigative authorities, data may be provided following the applicable procedures."
    ]
  },
  {
    title: "7. Cookies and analytics",
    body: [
      "We use essential cookies to keep you logged in.",
      "Analytics based on Google Tag Manager may be used to understand usage; you can refuse cookie storage in your browser settings."
    ]
  },
  {
    title: "8. Your rights",
    body: [
      "You can view, correct, delete, or request a halt to the processing of your personal data at any time.",
      "You can close your account yourself from the 'Close account' menu in My account once signed in.",
      "If you've forgotten your password, use 'Forgot your password?' on the log-in screen to get a reset link.",
      "For any other access, correction, or suspension request, contact the privacy officer below."
    ]
  }
];

const COPY = {
  ko: {
    back: "← 플래너 투게더",
    title: "개인정보처리방침",
    intro:
      "플래너 투게더(이하 “서비스”)는 이용자의 개인정보를 소중히 다루며, 관련 법령을 준수합니다.",
    contactTitle: "9. 개인정보 보호책임자",
    contactLines: [
      "책임자: Planner Together 운영자",
      "연락처: becky00301@gmail.com",
      "개인정보 처리에 관한 문의, 열람·정정·삭제 요청은 위 연락처로 접수하며, 지체 없이 답변드립니다."
    ],
    footer: "본 방침은 서비스 운영 상황에 따라 변경될 수 있으며, 변경 시 이 페이지를 통해 공지합니다.",
    sections: SECTIONS_KO
  },
  en: {
    back: "← Planner Together",
    title: "Privacy Policy",
    intro:
      "Planner Together (the “Service”) treats your personal data with care and complies with applicable law.",
    contactTitle: "9. Privacy officer",
    contactLines: [
      "Officer: Planner Together operator",
      "Contact: becky00301@gmail.com",
      "Questions about how your data is handled, and requests to access, correct, or delete it, go to the address above and are answered without delay."
    ],
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
            <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-7 text-muted">
              {copy.contactLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs leading-6 text-muted">{copy.footer}</p>
      </div>
    </main>
  );
}
