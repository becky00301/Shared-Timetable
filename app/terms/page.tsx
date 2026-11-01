"use client";

import Link from "next/link";
import { LegalPageHeader } from "@/components/layout/LegalPageHeader";
import { useLocale } from "@/lib/i18n/locale";

type Section = { title: string; body: string[] };

const SECTIONS_KO: Section[] = [
  {
    title: "제1조 목적과 운영자",
    body: [
      "이 약관은 Planner Together 운영자(이하 ‘운영자’)가 제공하는 공유 시간표 서비스 Planner Together(이하 ‘서비스’)의 이용 조건과 운영자 및 이용자의 권리·의무를 정합니다.",
      "서비스 주소는 https://www.planner-together.com이며, 이용 관련 문의는 becky00301@gmail.com으로 접수합니다.",
      "‘이용자’는 서비스를 이용하는 사람, ‘회원’은 계정을 만든 이용자, ‘콘텐츠’는 이용자가 입력하거나 등록한 시간표·일정·메모·장소·예산 정보·첨부 링크 등을 뜻합니다."
    ]
  },
  {
    title: "제2조 약관의 게시와 적용",
    body: [
      "운영자는 이용자가 이 약관을 쉽게 확인할 수 있도록 서비스에 게시합니다. 약관은 게시 후 이용자에게 제시되고 이용자가 동의한 때부터 해당 이용에 적용됩니다.",
      "운영자는 관계 법령을 위반하지 않는 범위에서 약관을 변경할 수 있습니다. 변경 내용, 사유 및 적용일은 원칙적으로 적용 7일 전부터 서비스에 안내하며, 이용자에게 불리하거나 권리·의무에 중대한 영향을 주는 변경은 30일 전부터 안내하고 가능한 연락 수단으로 알립니다.",
      "동의가 필요한 변경은 별도로 동의를 받습니다. 이용자의 침묵만으로 동의한 것으로 처리하지 않으며, 이용자는 변경에 동의하지 않을 경우 이용을 중단하거나 탈퇴할 수 있습니다. 변경 약관을 소급하여 적용하지 않습니다."
    ]
  },
  {
    title: "제3조 회원가입과 계정 관리",
    body: [
      "회원가입 및 공동 편집 기능은 만 14세 이상 이용자를 대상으로 합니다. 만 14세 미만은 회원가입을 할 수 없습니다.",
      "회원은 본인이 사용할 권한이 있는 이메일 또는 Google 계정으로 가입하고, 비밀번호와 로그인 상태를 안전하게 관리해야 합니다. 다른 사람의 계정을 무단으로 사용하거나 타인을 사칭해서는 안 됩니다.",
      "Google 로그인에는 Google의 인증 절차가 적용됩니다. 서비스는 회원의 Google 계정 비밀번호를 직접 받지 않습니다. 계정 도용이나 무단 접근을 알게 되면 운영자에게 알려주세요.",
      "보안·장애 대응 또는 부정 이용 방지를 위해 가입이나 로그인을 일시적으로 제한할 수 있으며, 그 사유가 해소되면 이용 재개를 지원합니다."
    ]
  },
  {
    title: "제4조 제공 기능과 이용 요금",
    body: [
      "서비스는 시간표 작성, 일정·메모·예산 관리, 참여자 초대와 공동 편집, 공유 링크 및 지원되는 형식의 내보내기 기능을 제공합니다. 실제 제공 범위는 서비스 화면에 표시된 기능을 따릅니다.",
      "현재 서비스는 무료이며 결제 수단을 요구하지 않습니다. 추후 유료 기능을 제공하는 경우 대상 기능, 가격, 결제·해지·환불 조건을 미리 안내하고 별도로 신청과 동의를 받습니다. 기존 이용만으로 요금이 자동 청구되지 않습니다.",
      "서비스에 입력한 일정, 장소 및 예산은 이용자가 계획을 위해 작성한 정보입니다. 서비스가 예약·결제·송금 또는 장소·가격의 정확성을 보증하는 것은 아니므로 실제 이용 전 해당 정보를 확인해야 합니다."
    ]
  },
  {
    title: "제5조 공동 편집과 링크 공유",
    body: [
      "시간표에는 소유자·편집자·열람자 등 역할에 따른 권한이 적용됩니다. 이용자는 본인에게 부여된 권한 범위에서 콘텐츠를 열람·수정·삭제하거나 참여자를 관리할 수 있습니다.",
      "공동 시간표에 입력한 내용은 해당 시간표의 참여자에게 공개되며, 권한을 가진 다른 참여자가 수정하거나 삭제할 수 있습니다. 다른 사람의 개인정보나 비공개 자료는 필요한 권한이나 동의 없이 올리거나 공유하지 마세요.",
      "초대 링크를 받은 사람은 해당 링크가 허용하는 범위에서 참여할 수 있고, 읽기 전용 공유·임베드 링크를 가진 사람은 로그인 없이 공개된 내용을 열람할 수 있습니다. 공유 범위와 참여자 권한을 확인한 뒤 링크를 전달하세요.",
      "공유를 해제하거나 링크를 변경해도 이미 다른 사람이 저장·내보내기·복사한 사본까지 자동으로 회수되지는 않습니다. 중요한 내용은 내보내기 기능 등을 이용해 별도로 보관할 수 있습니다."
    ]
  },
  {
    title: "제6조 콘텐츠의 권리와 이용 범위",
    body: [
      "이용자가 작성한 콘텐츠에 대한 저작권 등 권리는 원래의 권리자에게 있습니다. 서비스를 이용했다는 이유로 운영자에게 콘텐츠의 소유권이 이전되지 않습니다.",
      "이용자는 콘텐츠를 등록함으로써 저장, 화면 표시, 실시간 동기화, 이용자가 선택한 공유·내보내기, 백업 등 서비스 제공에 필요한 범위에서 운영자가 해당 콘텐츠를 처리하도록 허용합니다. 이용자가 선택한 범위를 넘어 공개하거나 광고에 사용하려면 별도 동의를 받습니다.",
      "서비스의 프로그램, 디자인과 상표 등 운영자에게 권리가 있는 요소는 관계 법령이 허용하거나 운영자가 허락한 범위를 넘어 무단 복제·배포할 수 없습니다. 이용자의 콘텐츠 및 적법한 이용까지 제한하는 것은 아닙니다."
    ]
  },
  {
    title: "제7조 금지 행위",
    body: [
      "타인 사칭, 계정 도용, 다른 사람의 개인정보·저작권 등 권리 침해, 불법 콘텐츠의 등록·공유, 괴롭힘이나 위협 등 관계 법령을 위반하는 행위를 해서는 안 됩니다.",
      "접근 권한 우회, 인증 정보 탈취, 악성코드 유포, 무단 데이터 수집 또는 과도한 자동 요청으로 서비스나 다른 이용자의 이용을 방해해서는 안 됩니다.",
      "권한 없이 다른 참여자의 자료를 삭제하거나, 초대·공유 기능을 스팸 및 원치 않는 광고 전송에 이용해서는 안 됩니다."
    ]
  },
  {
    title: "제8조 이용 제한과 이의 제기",
    body: [
      "법령 또는 이 약관 위반이 확인되거나 보안상 긴급한 위험이 있는 경우 운영자는 필요한 범위에서 콘텐츠 접근 제한, 기능의 일시 제한 또는 계정 이용 정지 조치를 할 수 있습니다. 조치는 위반의 내용과 정도에 비례해야 합니다.",
      "조치의 사유, 범위, 기간 및 이의 제기 방법을 가능한 연락 수단으로 사전에 알립니다. 긴급한 보안 위험이나 피해 확산 방지 등으로 사전 통지가 어려우면 조치 후 지체 없이 알립니다.",
      "이용자는 becky00301@gmail.com으로 설명이나 재검토를 요청할 수 있습니다. 운영자는 관련 사실을 확인하여 결과를 안내하고, 사유가 해소되거나 조치가 잘못된 경우 제한을 해제합니다."
    ]
  },
  {
    title: "제9조 서비스 변경·중단과 자료 보관",
    body: [
      "운영자는 안정적인 서비스 제공을 위해 노력하며, 점검·업데이트·장애·외부 제공업체의 문제 등으로 서비스의 일부 또는 전부가 일시 중단될 수 있습니다. 예정된 중단은 사전에, 예측하기 어려운 장애는 확인 후 가능한 한 신속하게 안내합니다.",
      "핵심 기능의 종료나 서비스 전체 종료처럼 이용에 중대한 영향을 미치는 변경은 원칙적으로 30일 전에 안내하고, 가능한 범위에서 이용자가 자료를 내보낼 기회를 제공합니다. 긴급한 보안 문제나 법적 의무 등으로 사전 안내가 불가능한 경우에는 그 사유를 함께 안내합니다.",
      "인터넷 연결이나 동기화 오류로 변경 사항이 저장되지 않을 수 있으므로 중요한 자료는 저장 상태를 확인하고 사본을 보관하세요. 이는 운영자의 법령상 자료 보호 및 손해배상 의무를 면제하지 않습니다."
    ]
  },
  {
    title: "제10조 회원 탈퇴와 콘텐츠 삭제",
    body: [
      "회원은 로그인 후 마이페이지에서 탈퇴를 요청할 수 있습니다. 직접 처리하기 어려운 경우 문의 이메일로 요청하면 본인 확인 후 안내합니다. Google 계정의 연결만 해제하는 것은 서비스 계정 탈퇴와 다릅니다.",
      "탈퇴 시 계정 정보와 본인만 참여 중인 시간표는 삭제됩니다. 다른 참여자가 있는 시간표는 남은 참여자에게 소유권이 이전되어 유지될 수 있으며, 탈퇴 회원의 계정 연결은 제거됩니다. 공유 콘텐츠의 처리 방식은 개인정보처리방침에도 안내합니다.",
      "삭제 전 필요한 자료를 내보내세요. 삭제가 완료된 데이터는 복구가 어려울 수 있습니다. 법령에 따른 별도 보관 의무나 백업 사본의 처리에는 개인정보처리방침을 적용합니다."
    ]
  },
  {
    title: "제11조 개인정보와 외부 서비스",
    body: [
      "개인정보의 수집·이용·보관·삭제 및 이용자의 권리 행사에 관한 사항은 별도로 게시한 개인정보처리방침에 따릅니다. 이 약관에 대한 동의가 법령상 별도 동의가 필요한 개인정보 처리의 동의를 대신하지 않습니다.",
      "Google 로그인, 지도, 외부 첨부 링크 및 피드백 양식 등 외부 서비스에는 해당 제공업체의 약관과 정책이 적용될 수 있습니다. 외부 서비스의 변경이나 장애가 관련 기능에 영향을 줄 수 있습니다.",
      "외부 제공업체를 이용한다는 이유로 운영자 자신의 법령상 의무나 귀책사유에 따른 책임이 면제되지는 않습니다."
    ]
  },
  {
    title: "제12조 책임과 분쟁 해결",
    body: [
      "운영자 또는 이용자가 고의나 과실로 상대방에게 손해를 입힌 경우 관계 법령에 따라 책임을 부담합니다. 무료 서비스라는 이유만으로 운영자의 책임을 일괄 면제하지 않습니다.",
      "이용자 사이에 공유·편집 권한이나 콘텐츠에 관한 분쟁이 생기면 당사자 사이의 협의를 우선하며, 운영자는 신고 내용을 확인하고 권한 관리 등 서비스가 제공하는 범위에서 해결을 지원합니다.",
      "이 약관에는 대한민국 법령을 적용하되 이용자에게 적용되는 강행규정상 권리를 제한하지 않습니다. 소송이 필요한 경우 관할은 민사소송법 등 관계 법령에 따르며 특정 지역의 법원을 전속 관할로 강제하지 않습니다."
    ]
  },
  {
    title: "제13조 문의와 기타 사항",
    body: [
      "운영자: Planner Together 운영자 / 문의 이메일: becky00301@gmail.com",
      "약관, 계정 이용, 콘텐츠 권리 침해 및 서비스 장애에 관한 문의는 위 이메일로 접수할 수 있습니다.",
      "이 약관에서 정하지 않은 사항은 관계 법령과 이용자와의 개별 합의에 따릅니다. 일부 조항이 무효인 경우에도 나머지 조항은 법령이 허용하는 범위에서 효력을 유지합니다."
    ]
  }
];

const SECTIONS_EN: Section[] = [
  {
    title: "1. Purpose and operator",
    body: [
      "These Terms set out the conditions for using Planner Together (the Service) and the rights and responsibilities of its operator (the Operator) and its users.",
      "The Service is available at https://www.planner-together.com. Contact the Operator at becky00301@gmail.com.",
      "A user is anyone who uses the Service; a member is a user with an account. Content includes user-created timetables, schedules, notes, locations, budget information and attachment links."
    ]
  },
  {
    title: "2. Publication and acceptance",
    body: [
      "These Terms are published in the Service for users to review. They apply to a user's use once they have been published, presented to that user and accepted by that user.",
      "The Operator may amend the Terms in accordance with applicable law. Changes, reasons and the effective date will normally be announced at least 7 days in advance, or at least 30 days for changes that disadvantage users or materially affect their rights or responsibilities. Available contact channels will also be used for material changes.",
      "Separate consent will be requested where required. Silence alone will not be treated as consent. Users who do not accept changes may stop using the Service or close their account. Changes will not apply retroactively."
    ]
  },
  {
    title: "3. Registration and account security",
    body: [
      "Registration and collaborative editing are intended for users aged 14 and over. Children under 14 may not register.",
      "Members must register using an email or Google account they are authorized to use and protect their passwords and signed-in sessions. Do not use another person's account without permission or impersonate them.",
      "Google sign-in follows Google's authentication process. The Service does not directly receive your Google account password. Contact the Operator if you discover account theft or unauthorized access.",
      "Registration or sign-in may be temporarily restricted to address security incidents, outages or abuse. The Operator will support restoration when the reason has been resolved."
    ]
  },
  {
    title: "4. Features and fees",
    body: [
      "The Service provides timetables, schedules, notes and budget management, participant invitations, collaborative editing, sharing links and supported export formats. Available features are those shown in the Service.",
      "The Service is currently free and does not request payment details. Any future paid features will have advance notice of their scope, price, payment, cancellation and refund conditions and require a separate request and consent. Existing use will not automatically create a charge.",
      "Schedules, locations and budgets are planning information entered by users. The Service does not make reservations, payments or transfers or guarantee location or price accuracy. Verify information before relying on it."
    ]
  },
  {
    title: "5. Collaboration and sharing",
    body: [
      "Timetable permissions depend on roles such as owner, editor and viewer. Users may view, edit or delete content and manage participants within their assigned permissions.",
      "Content entered in a shared timetable is visible to its participants and may be changed or deleted by other authorized participants. Obtain the necessary permission or consent before uploading or sharing another person's personal data or confidential material.",
      "An invitation link may allow its recipient to join within the link's permissions. Anyone holding a read-only sharing or embed link may view the content it exposes without signing in. Check the sharing scope and participant permissions before distributing a link.",
      "Revoking sharing or changing a link does not automatically recall copies that others have already saved, exported or copied. You can use export features to retain a separate copy of important content."
    ]
  },
  {
    title: "6. Content rights and permitted processing",
    body: [
      "Copyright and other rights in user content remain with the relevant rights holder. Using the Service does not transfer ownership of that content to the Operator.",
      "By submitting content, you permit the Operator to process it as needed for storage, display, live synchronization, your selected sharing and export options, backups and other service delivery. Public disclosure beyond your chosen scope or use in advertising requires separate consent.",
      "Software, designs and trademarks owned by the Operator may not be copied or distributed beyond what applicable law or the Operator permits. This does not restrict users' rights in their own content or other lawful use."
    ]
  },
  {
    title: "7. Prohibited conduct",
    body: [
      "Do not impersonate others, steal accounts, infringe privacy, copyright or other rights, post or share unlawful content, harass, threaten or otherwise violate applicable law.",
      "Do not bypass access controls, steal credentials, distribute malware, collect data without authorization or disrupt the Service or other users with excessive automated requests.",
      "Do not delete other participants' material without authority or use invitations or sharing for spam or unsolicited advertising."
    ]
  },
  {
    title: "8. Restrictions and appeals",
    body: [
      "Where a violation of law or these Terms is established, or an urgent security risk exists, the Operator may restrict content access, temporarily limit features or suspend an account as necessary and proportionate to the issue.",
      "The reasons, scope, duration and appeal process will be communicated through available channels beforehand. If urgent security risks or harm prevention make prior notice impracticable, notice will follow without undue delay.",
      "Users may request an explanation or review at becky00301@gmail.com. The Operator will review the relevant facts, communicate the outcome and lift restrictions when their cause is resolved or a measure was mistaken."
    ]
  },
  {
    title: "9. Changes, interruptions and copies",
    body: [
      "The Operator works to provide a reliable service. Maintenance, updates, outages or issues with external providers may temporarily interrupt some or all features. Planned interruptions will be announced beforehand; unexpected outages will be communicated as promptly as practicable after discovery.",
      "Material changes such as the closure of a core feature or the entire Service will normally be announced at least 30 days in advance, with an opportunity to export data where practicable. If an urgent security issue or legal obligation prevents advance notice, the reasons will be explained.",
      "Connection or synchronization failures can prevent changes from being saved. Check saving status and retain copies of important material. This does not waive the Operator's legal data-protection or compensation obligations."
    ]
  },
  {
    title: "10. Account closure and deletion",
    body: [
      "Members can request account closure in My account after signing in. If this is not possible, contact support for assistance after identity verification. Revoking Google access alone does not close your Service account.",
      "Account closure deletes account data and timetables where the member is the only participant. Timetables with other participants may remain and be transferred to a remaining participant, with the departing member's account connection removed. The Privacy Policy also explains shared-content handling.",
      "Export needed material before deletion. Fully deleted data may be difficult to restore. Legally required retention and backup copies are handled under the Privacy Policy."
    ]
  },
  {
    title: "11. Personal data and external services",
    body: [
      "Collection, use, retention and deletion of personal data and user rights are explained in the separate Privacy Policy. Accepting these Terms does not replace any separate consent required by law for personal-data processing.",
      "Google sign-in, maps, external attachment links and feedback forms may be subject to their providers' terms and policies. Changes or outages affecting those services may affect related features.",
      "Using external providers does not exempt the Operator from its own legal obligations or responsibility for its own fault."
    ]
  },
  {
    title: "12. Responsibility and disputes",
    body: [
      "The Operator and users are responsible under applicable law for loss caused by their intentional or negligent acts. The Service being free does not create a blanket exemption from the Operator's liability.",
      "Users should first seek agreement in disputes about sharing, editing permissions or content. The Operator will review reports and assist within the Service's available capabilities, including permission management.",
      "These Terms are governed by the laws of the Republic of Korea without limiting mandatory rights that apply to users. Court jurisdiction follows applicable procedural law; these Terms do not impose exclusive jurisdiction in a particular location."
    ]
  },
  {
    title: "13. Contact and other provisions",
    body: [
      "Operator: Planner Together operator / Contact: becky00301@gmail.com",
      "Send questions about these Terms, account use, content-rights violations or service outages to the email above.",
      "Matters not covered here follow applicable law and any individual agreement with the user. If a provision is invalid, the remaining provisions continue to apply to the extent permitted by law."
    ]
  }
];

const COPY = {
  ko: {
    back: "← 뒤로",
    title: "서비스 이용약관",
    intro: "함께 시간표를 만들고 공유할 때 적용되는 이용 조건입니다. 계정 관리, 공유 범위, 콘텐츠의 권리와 탈퇴 시 처리 내용을 확인해주세요.",
    dateLabel: "작성일",
    date: "2026년 10월 22일",
    effectiveLabel: "적용 시점",
    effective: "게시 후 이용자가 동의한 때부터",
    privacy: "개인정보처리방침",
    contact: "문의하기",
    footer: "이용자의 콘텐츠 권리는 원래의 권리자에게 있습니다. 공동 편집·공유 및 탈퇴 전에는 참여자 권한과 자료 보관 여부를 확인해주세요.",
    sections: SECTIONS_KO
  },
  en: {
    back: "← Back",
    title: "Terms of Service",
    intro: "These are the conditions for creating and sharing timetables together. Please review account security, sharing permissions, content rights and what happens when you close your account.",
    dateLabel: "Prepared",
    date: "October 22, 2026",
    effectiveLabel: "Applies from",
    effective: "User acceptance after publication",
    privacy: "Privacy Policy",
    contact: "Contact",
    footer: "Content rights remain with their rights holders. Check participant permissions and retain needed copies before sharing, collaborative editing or account closure.",
    sections: SECTIONS_EN
  }
} as const;

export default function TermsPage() {
  const { locale } = useLocale();
  const copy = COPY[locale];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LegalPageHeader backLabel={copy.back} />
      <div className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">{copy.intro}</p>

        <dl className="mt-6 grid gap-4 border-y border-border py-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted">{copy.dateLabel}</dt>
            <dd className="mt-1 font-medium"><time dateTime="2026-10-22">{copy.date}</time></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">{copy.effectiveLabel}</dt>
            <dd className="mt-1 font-medium">{copy.effective}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-col gap-10">
          {copy.sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`terms-section-${index + 1}`}>
              <h2 id={`terms-section-${index + 1}`} className="text-lg font-semibold">{section.title}</h2>
              <ul className="mt-3 flex list-disc flex-col gap-2 pl-5 text-sm leading-7 text-muted">
                {section.body.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-12 border-t border-border pt-6 text-xs leading-6 text-muted">
          <p>{copy.footer}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">{copy.privacy}</Link>
            <a href="mailto:becky00301@gmail.com" className="underline underline-offset-2 hover:text-foreground">{copy.contact}</a>
          </div>
        </div>
      </div>
    </main>
  );
}
