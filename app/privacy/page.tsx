"use client";

import Link from "next/link";
import { useLocale } from "@/lib/i18n/locale";

type Section = { title: string; body: string[] };

const SECTIONS_KO: Section[] = [
  {
    title: "제1조 개인정보의 처리 목적",
    body: [
      "회원가입, 본인 식별, 로그인 상태 유지, 비밀번호 변경 및 회원 탈퇴 처리",
      "비회원 체험 이용자의 임시 식별과 시간표 재접속 기능 제공",
      "시간표 작성·공유·초대·공동 편집·내보내기 기능 제공",
      "이용자가 선택한 경우 Google Calendar 연결 및 일정 동기화",
      "문의·피드백 처리, 서비스 이용 현황 분석, 오류 확인, 부정 이용 방지 및 보안 유지"
    ]
  },
  {
    title: "제2조 처리하는 개인정보의 항목 및 수집 방법",
    body: [
      "회원가입 시 필수 항목: 이메일 주소, 인증용 사용자 식별값. 비밀번호는 Supabase Auth가 인증 목적으로 처리하며, 운영자는 비밀번호 원문을 조회하거나 별도로 저장하지 않습니다.",
      "비회원 체험 시: 임의로 생성된 익명 사용자 식별값, 게스트 표시 이름",
      "서비스 이용 시: 시간표 이름·설명·종류·선택 날짜, 일정 제목·날짜·시간·장소·메모·색상, 자유 메모, 첨부 링크, 참여자 이메일·역할, 초대 및 공유를 위한 식별값",
      "Google Calendar 연동 시 선택 항목: Google 계정 이메일, OAuth 접근 토큰·갱신 토큰·만료 시각, Google 캘린더 및 이벤트 식별값. 동기화할 일정 제목·날짜·시간·장소·메모가 Google로 전송됩니다.",
      "피드백 제출 시: 이용자가 Google Forms에 직접 입력한 피드백 내용과 선택적으로 입력한 연락 정보",
      "자동 생성 정보: 접속 IP 주소, 접속 시각, 방문 URL과 동적 경로, 필터링된 쿼리 매개변수, 이전 페이지 주소, 대략적인 접속 지역, 운영체제·브라우저·기기 유형, 서비스 이용 기록, 인증 세션 쿠키",
      "수집 방법: 회원가입 및 서비스 입력 화면, 비회원 체험 생성, Google OAuth 연동, 고객 문의·피드백, 서비스 이용 중 자동 생성되는 로그와 분석 이벤트",
      "서비스는 주민등록번호와 같은 고유식별정보나 건강·사상·정치성향과 같은 민감정보를 의도적으로 요구하지 않습니다. 일정 또는 메모에 불필요한 민감정보를 입력하지 마세요."
    ]
  },
  {
    title: "제3조 개인정보의 처리 및 보유 기간",
    body: [
      "회원 계정 정보: 회원 탈퇴 시까지. 탈퇴 처리가 완료되면 지체 없이 삭제합니다.",
      "시간표·일정·메모·참여 정보: 이용자가 해당 시간표를 삭제할 때까지. 시간표 삭제 시 그 시간표에 속한 날짜, 일정, 메모 및 첨부 정보도 함께 삭제합니다.",
      "비회원 체험 정보: 이용자가 해당 시간표를 삭제하거나 서비스 운영상 해당 익명 계정과 시간표를 정리할 때까지",
      "Google 계정 이메일과 OAuth 토큰: 이용자가 Google Calendar 연결을 해제하거나 회원 탈퇴할 때까지",
      "Vercel Web Analytics 방문자 식별용 해시: 24시간 후 자동 폐기. 개인을 식별하지 않는 집계 통계는 분석 기능에서 삭제하거나 해당 서비스 이용을 종료할 때까지",
      "접속 및 오류 로그: 보안·장애 대응에 필요한 기간 또는 호스팅 제공자의 계약 및 설정에 따른 보유기간까지",
      "관계 법령에서 별도 보관을 요구하는 정보가 발생한 경우에는 해당 법령에서 정한 기간 동안 분리 보관한 후 삭제합니다. 현재 서비스는 유료 결제를 제공하지 않아 결제·거래 기록을 수집하지 않습니다."
    ]
  },
  {
    title: "제4조 개인정보의 제3자 제공 및 공동 시간표 공개",
    body: [
      "서비스는 이용자의 개인정보를 판매하지 않으며, 원칙적으로 사전 동의 없이 제3자에게 제공하지 않습니다.",
      "이용자가 시간표를 공유하거나 다른 사람을 초대하면 해당 시간표의 내용과 참여자 이메일·역할이 그 시간표의 다른 참여자에게 공개됩니다.",
      "이용자가 Google Calendar 동기화를 요청한 경우 Google LLC에 Google 계정 이메일과 일정 제목·날짜·시간·장소·메모가 전송됩니다. 전송된 정보는 이용자의 Google 계정에서 일정을 삭제하거나 Google의 보유정책에 따라 삭제될 때까지 처리됩니다.",
      "법률의 특별한 규정이나 수사기관의 적법한 요구가 있는 경우에는 개인정보 보호법 제17조 및 제18조가 허용하는 범위에서 제공할 수 있습니다."
    ]
  },
  {
    title: "제5조 개인정보 처리 위탁 및 국외 처리",
    body: [
      "Supabase, Inc.: 회원 인증, 데이터베이스, 실시간 협업 데이터 처리. 이메일, 사용자 식별값, 인증 정보, 시간표·일정·메모·참여 정보와 Google 연동 토큰을 처리합니다.",
      "Vercel Inc.: 웹 서비스 호스팅, 요청 처리, 배포 로그 및 Web Analytics 제공. 접속 정보, 서비스 요청 데이터와 익명 집계 분석 정보를 처리합니다.",
      "Google LLC: 이용자가 선택한 Google Calendar 연동, Google Tag Manager가 설정된 경우 태그 실행, Google Forms를 통한 피드백 접수에 필요한 정보를 처리합니다.",
      "위 업체는 미국에 본사를 두고 글로벌 인프라를 운영하므로, 정보가 암호화된 통신망을 통해 미국 또는 각 업체가 운영하는 서버 소재 국가에서 처리될 수 있습니다. 이전 시점은 회원가입, 서비스 접속, 연동 또는 피드백 제출 시이며, 보유기간은 제3조 및 각 업체와의 계약·개인정보처리방침에 따릅니다.",
      "Google Calendar 국외 처리를 원하지 않으면 연동 기능을 사용하지 않거나 연결을 해제할 수 있습니다. 핵심 호스팅·인증 처리에 동의하지 않는 경우 서비스 이용이 제한될 수 있으며, 회원 탈퇴로 처리를 중단할 수 있습니다.",
      "서비스는 위탁계약과 제공업체 설정을 통해 목적 외 처리 제한, 접근 통제, 비밀 유지 및 안전한 처리 여부를 확인합니다."
    ]
  },
  {
    title: "제6조 개인정보의 파기 절차 및 방법",
    body: [
      "보유기간이 끝나거나 처리 목적이 달성되어 개인정보가 불필요해지면 지체 없이 삭제합니다. 전자적 정보는 복구가 어렵도록 데이터베이스와 인증 시스템에서 삭제하며 종이 문서로 보관하지 않습니다.",
      "회원 탈퇴 시 계정 정보, Google 연동 토큰, 본인만 참여 중인 시간표를 함께 삭제합니다.",
      "다른 참여자가 있는 시간표는 서비스 지속을 위해 남은 참여자에게 소유권이 이전될 수 있습니다. 이 경우 탈퇴 이용자의 계정 연결 정보는 제거되고, 작성자 식별값은 삭제되거나 연결이 해제됩니다.",
      "백업에 남은 사본은 복구 및 보안 목적 외에는 사용하지 않으며 백업 보관 주기가 끝나면 순차적으로 삭제합니다."
    ]
  },
  {
    title: "제7조 정보주체의 권리와 행사 방법",
    body: [
      "이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지 및 법령상 적용되는 경우 전송을 요구할 수 있습니다.",
      "계정 정보 확인, 비밀번호 변경 및 회원 탈퇴는 로그인 후 마이페이지에서 직접 할 수 있습니다. 시간표·일정·메모는 각 시간표 화면에서 수정하거나 삭제할 수 있습니다.",
      "그 밖의 요청은 becky00301@gmail.com으로 접수할 수 있으며, 대리인을 통해 권리를 행사하는 경우 적법한 위임 관계를 확인할 수 있습니다.",
      "서비스는 요청자의 본인 여부를 확인한 뒤 지체 없이 처리합니다. 법령에서 요청을 제한하거나 거절할 수 있도록 정한 경우에는 그 사유와 이의 제기 방법을 안내합니다."
    ]
  },
  {
    title: "제8조 쿠키와 분석 도구의 사용 및 거부",
    body: [
      "로그인 상태와 보안을 유지하기 위해 Supabase 인증 세션 쿠키를 사용합니다. 필수 쿠키를 차단하면 로그인과 협업 기능이 정상적으로 동작하지 않을 수 있습니다.",
      "Vercel Web Analytics는 제3자 쿠키 없이 페이지 조회와 이벤트 시각, URL, 동적 경로, 필터링된 쿼리 매개변수, 이전 페이지 주소, 대략적인 지역, 운영체제·브라우저·기기 유형을 익명 집계 방식으로 처리합니다. 방문자 해시는 24시간 후 폐기됩니다.",
      "Google Tag Manager는 환경 설정이 활성화된 경우에만 로드되며, 실제 수집 범위는 연결된 태그 설정에 따라 달라집니다. 서비스는 이메일이나 일정 내용이 분석 이벤트에 포함되지 않도록 운영합니다.",
      "쿠키는 Chrome·Safari·Edge·Firefox의 개인정보 또는 사이트 데이터 설정에서 삭제하거나 차단할 수 있습니다. 모바일 브라우저에서도 해당 브라우저의 사이트 추적 및 쿠키 설정을 변경할 수 있습니다."
    ]
  },
  {
    title: "제9조 개인정보의 안전성 확보 조치",
    body: [
      "인증 정보와 비밀번호 처리를 인증 전문 서비스에 분리하고, 통신 구간을 HTTPS로 암호화합니다.",
      "데이터베이스 행 단위 접근정책과 참여자 역할에 따라 시간표 조회·수정 권한을 제한합니다.",
      "관리자 권한 키와 Google OAuth 비밀키는 서버 환경변수로 관리하고 브라우저에 노출하지 않습니다.",
      "개인정보에 접근할 수 있는 권한을 서비스 운영에 필요한 범위로 제한하고, 접속 및 오류 기록을 통해 비정상 접근을 확인합니다.",
      "데이터 삭제, 백업, 의존성 보안 점검과 서비스 제공업체의 보안 기능을 이용해 분실·유출·변조 위험을 줄입니다."
    ]
  },
  {
    title: "제10조 만 14세 미만 아동의 개인정보",
    body: [
      "서비스는 만 14세 미만 아동을 대상으로 제공되지 않으며, 아동의 개인정보를 의도적으로 수집하지 않습니다.",
      "만 14세 미만 아동의 개인정보가 법정대리인 동의 없이 수집된 사실을 확인하면 해당 정보를 지체 없이 삭제합니다. 법정대리인은 보호 중인 아동의 개인정보에 대한 열람·정정·삭제를 이메일로 요청할 수 있습니다."
    ]
  },
  {
    title: "제11조 자동화된 결정",
    body: [
      "서비스는 인공지능 또는 자동화된 처리만으로 이용자의 권리·의무에 중대한 영향을 미치는 결정을 하지 않습니다.",
      "향후 자동화된 결정을 도입하는 경우 결정의 목적, 대상 정보, 기준, 절차와 거부·설명 요구 방법을 시행 전에 이 방침으로 안내합니다."
    ]
  },
  {
    title: "제12조 개인정보 보호책임자 및 열람청구 접수처",
    body: [
      "개인정보 보호책임자: Planner Together 운영자",
      "개인정보 열람청구 및 고충처리 담당: Planner Together 운영자",
      "이메일: becky00301@gmail.com",
      "개인정보 처리에 관한 문의, 불만, 열람·정정·삭제·처리정지 요청을 위 이메일로 접수하며 확인 후 지체 없이 답변합니다."
    ]
  },
  {
    title: "제13조 권익침해 구제 방법",
    body: [
      "개인정보분쟁조정위원회: 1833-6972, www.kopico.go.kr",
      "개인정보침해신고센터: 국번 없이 118, privacy.kisa.or.kr",
      "대검찰청: 국번 없이 1301, www.spo.go.kr",
      "경찰청: 국번 없이 182, ecrm.police.go.kr",
      "위 기관은 서비스와 별개의 기관이며, 개인정보 침해에 대한 상담이나 분쟁 해결이 필요한 경우 이용할 수 있습니다."
    ]
  },
  {
    title: "제14조 개인정보처리방침의 변경",
    body: [
      "이 방침의 내용이 변경되는 경우 시행 7일 전부터 이 페이지를 통해 알립니다. 이용자 권리에 중대한 영향을 미치는 변경은 가능한 경우 시행 30일 전에 알립니다.",
      "시행일: 2026년 8월 4일",
      "최종 개정일: 2026년 8월 4일"
    ]
  }
];

const SECTIONS_EN: Section[] = [
  {
    title: "1. Purposes of processing",
    body: [
      "Account registration, identification, session management, password changes, and account closure",
      "Temporary identification of guest users and access to their timetable by its saved link",
      "Timetable creation, sharing, invitations, collaboration, and export",
      "Google Calendar connection and schedule sync when requested by the user",
      "Support and feedback, usage analytics, error diagnosis, abuse prevention, and security"
    ]
  },
  {
    title: "2. Data processed and how it is collected",
    body: [
      "Required at registration: email address and authentication user ID. Supabase Auth processes the password for authentication; the operator cannot read or separately store the plain-text password.",
      "For guest trials: a randomly generated anonymous user ID and guest display name",
      "While using the Service: timetable name, description, type and dates; schedule title, date, time, location, notes and color; free-form notes, attachment links, participant emails and roles, and invitation and sharing identifiers",
      "Optional Google Calendar connection: Google account email, OAuth access and refresh tokens, expiry time, and Google calendar and event IDs. Schedule titles, dates, times, locations and notes selected for sync are sent to Google.",
      "When feedback is submitted: the response and any contact details the user voluntarily enters in Google Forms",
      "Generated automatically: IP address, access time, visited URL and dynamic route, filtered query parameters, referrer, approximate location, operating system, browser and device type, service activity, and authentication session cookies",
      "Collection methods: registration and service forms, guest creation, Google OAuth, support and feedback, and logs and analytics events generated during use",
      "The Service does not intentionally request government-issued identifiers or sensitive data such as health, beliefs, or political opinions. Do not place unnecessary sensitive data in schedules or notes."
    ]
  },
  {
    title: "3. Retention",
    body: [
      "Member account data: until the account is closed, then deleted without undue delay",
      "Timetables, schedules, notes and participation data: until the timetable is deleted. Its dates, schedules, notes and attachments are deleted with it.",
      "Guest trial data: until the guest deletes the timetable or it is removed as part of operational cleanup",
      "Google email and OAuth tokens: until the user disconnects Google Calendar or closes the account",
      "Vercel Web Analytics visitor hash: discarded automatically after 24 hours. Non-identifying aggregate statistics remain until deleted from analytics or the analytics service is discontinued.",
      "Access and error logs: for the period needed for security and incident response, or for the retention period configured with the hosting provider",
      "If law requires a separate retention period, the applicable data is isolated and deleted when that period ends. The Service currently has no paid checkout and collects no payment or transaction records."
    ]
  },
  {
    title: "4. Third-party disclosure and shared timetables",
    body: [
      "We do not sell personal data and do not disclose it to third parties without prior consent unless permitted by law.",
      "When a user shares a timetable or invites another person, that timetable's contents and participant emails and roles become visible to its participants.",
      "When Google Calendar sync is requested, Google LLC receives the Google account email and schedule title, date, time, location and notes. Google processes that data until the user deletes it from the Google account or under Google's retention policy.",
      "Data may be disclosed within the scope permitted by applicable law in response to a specific legal obligation or a lawful request from authorities."
    ]
  },
  {
    title: "5. Processors and international processing",
    body: [
      "Supabase, Inc.: authentication, database and real-time collaboration. It processes email, user IDs, authentication data, timetable content, participation data and Google connection tokens.",
      "Vercel Inc.: web hosting, request handling, deployment logs and Web Analytics. It processes connection information, service requests and anonymous aggregate analytics.",
      "Google LLC: optional Google Calendar sync, configured tags through Google Tag Manager, and feedback collection through Google Forms.",
      "These providers are headquartered in the United States and operate global infrastructure. Data may therefore be processed in the United States or another country in which a provider operates, over encrypted networks, when a user registers, accesses the Service, connects an integration, or submits feedback. Retention follows section 3 and each provider agreement and privacy policy.",
      "Users may avoid or disconnect Google Calendar if they do not want that optional international processing. Refusing essential hosting or authentication processing may prevent use of the Service; users may stop it by closing their account.",
      "We use provider contracts and settings to require purpose limitation, access controls, confidentiality and appropriate security."
    ]
  },
  {
    title: "6. Deletion",
    body: [
      "Data is deleted without undue delay when its retention period expires or its purpose is fulfilled. Electronic records are removed from the database and authentication systems so they cannot ordinarily be restored. We hold no paper records.",
      "Closing an account deletes its account data, Google tokens, and timetables where that user is the only participant.",
      "A timetable with other participants may be transferred to a remaining participant. The departing user's account link is removed and author identifiers are deleted or detached.",
      "Backup copies are not used except for recovery and security and expire with the backup cycle."
    ]
  },
  {
    title: "7. Your rights and how to exercise them",
    body: [
      "You may request access, correction, deletion, restriction, and, where applicable by law, transfer of your personal data.",
      "Account details, password changes and account closure are available in My account. Timetables, schedules and notes can be edited or deleted in their timetable.",
      "Other requests can be sent to becky00301@gmail.com. A lawful representative may act for you after we verify the authority to do so.",
      "We verify the requester and respond without undue delay. If law permits a request to be limited or denied, we explain the reason and how to object."
    ]
  },
  {
    title: "8. Cookies and analytics",
    body: [
      "Supabase authentication session cookies keep users signed in and protect the account. Blocking essential cookies can prevent login and collaboration from working.",
      "Without third-party cookies, Vercel Web Analytics processes page-view and event time, URL, dynamic route, filtered query parameters, referrer, approximate location, operating system, browser and device type as anonymous aggregate data. Its visitor hash expires after 24 hours.",
      "Google Tag Manager loads only when enabled in the environment. The precise scope then depends on the connected tags. We operate analytics so that emails and schedule contents are not included in analytics events.",
      "Cookies can be removed or blocked in the privacy or site-data settings of Chrome, Safari, Edge and Firefox, including their mobile versions."
    ]
  },
  {
    title: "9. Security measures",
    body: [
      "Authentication and password handling are separated into a dedicated authentication service, and data in transit is encrypted with HTTPS.",
      "Database row-level policies and participant roles restrict access to and changes of timetable data.",
      "Administrative keys and Google OAuth secrets are held in server environment variables and are not exposed to the browser.",
      "Access is limited to what is needed to operate the Service, and connection and error records support detection of abnormal access.",
      "Deletion, backups, dependency security checks and provider security controls reduce the risk of loss, leakage and tampering."
    ]
  },
  {
    title: "10. Children under 14",
    body: [
      "The Service is not directed to children under 14 and does not intentionally collect their personal data.",
      "If we learn that a child's data was collected without a guardian's consent, we delete it without undue delay. A guardian may request access, correction or deletion by email."
    ]
  },
  {
    title: "11. Automated decisions",
    body: [
      "The Service does not use AI or solely automated processing to make decisions that have a significant effect on a user's rights or obligations.",
      "If such processing is introduced, its purpose, data, criteria and procedure, and the ways to object or request an explanation, will be disclosed before it begins."
    ]
  },
  {
    title: "12. Privacy officer and request desk",
    body: [
      "Privacy officer: Planner Together operator",
      "Data access and complaint desk: Planner Together operator",
      "Email: becky00301@gmail.com",
      "Questions, complaints, and requests to access, correct, delete or restrict data are accepted at this email and answered after verification without undue delay."
    ]
  },
  {
    title: "13. Remedies",
    body: [
      "Personal Information Dispute Mediation Committee: +82-1833-6972, www.kopico.go.kr",
      "KISA Privacy Infringement Report Center: +82-118, privacy.kisa.or.kr",
      "Supreme Prosecutors' Office: +82-1301, www.spo.go.kr",
      "Korean National Police Agency: +82-182, ecrm.police.go.kr",
      "These agencies are independent of the Service and can provide advice or dispute resolution for privacy infringements."
    ]
  },
  {
    title: "14. Changes to this policy",
    body: [
      "Changes are announced on this page at least seven days before they take effect. Where a change materially affects user rights, we aim to provide 30 days' notice.",
      "Effective date: August 4, 2026",
      "Last revised: August 4, 2026"
    ]
  }
];

const COPY = {
  ko: {
    back: "← 플래너 투게더",
    title: "개인정보처리방침",
    intro:
      "Planner Together(이하 “서비스”)는 개인정보 보호법 제30조에 따라 이용자의 개인정보를 보호하고 관련 요청과 고충을 신속하게 처리하기 위해 다음과 같이 개인정보처리방침을 공개합니다.",
    effectiveLabel: "시행일",
    effectiveDate: "2026년 8월 4일",
    revisedLabel: "최종 개정일",
    revisedDate: "2026년 8월 4일",
    footer:
      "이 방침은 서비스의 실제 운영 방식과 적용 법령을 기준으로 작성한 안내입니다. 서비스 기능이나 외부 처리업체가 변경되면 이 페이지도 함께 갱신합니다.",
    sections: SECTIONS_KO
  },
  en: {
    back: "← Planner Together",
    title: "Privacy Policy",
    intro:
      "Planner Together (the “Service”) publishes this policy to protect personal data and handle privacy requests and complaints under Article 30 of Korea's Personal Information Protection Act.",
    effectiveLabel: "Effective",
    effectiveDate: "August 4, 2026",
    revisedLabel: "Last revised",
    revisedDate: "August 4, 2026",
    footer:
      "This notice reflects the Service's current operation and applicable law. It will be updated when service features or external processors change.",
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
        <p className="mt-3 text-sm leading-7 text-muted">{copy.intro}</p>

        <dl className="mt-6 grid grid-cols-2 border-y border-border py-4 text-sm">
          <div>
            <dt className="text-xs text-muted">{copy.effectiveLabel}</dt>
            <dd className="mt-1 font-medium">{copy.effectiveDate}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{copy.revisedLabel}</dt>
            <dd className="mt-1 font-medium">{copy.revisedDate}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col gap-10">
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
        </div>

        <p className="mt-12 border-t border-border pt-6 text-xs leading-6 text-muted">{copy.footer}</p>
      </div>
    </main>
  );
}
