// Every user-facing string lives here so the UI can render in Korean or
// English. Keys are grouped by area; ko and en sit side by side so a missing
// translation is visible at a glance (and a type error if omitted).
//
// Placeholders use {name} and are filled by the `t(key, vars)` helper.

export const messages = {
  // ---------------------------------------------------------------- common
  "common.dashboard": { ko: "대시보드", en: "Dashboard" },
  "common.login": { ko: "로그인", en: "Log in" },
  "common.logout": { ko: "로그아웃", en: "Log out" },
  "common.signup": { ko: "회원가입", en: "Sign up" },
  "common.delete": { ko: "삭제", en: "Delete" },
  "common.back": { ko: "뒤로", en: "Back" },
  "common.next": { ko: "다음", en: "Next" },
  "common.close": { ko: "닫기", en: "Close" },
  "common.cancel": { ko: "취소", en: "Cancel" },
  "common.rename": { ko: "이름 수정", en: "Rename" },
  "common.name": { ko: "이름", en: "Name" },
  "common.loading": { ko: "불러오는 중...", en: "Loading…" },
  "common.optional": { ko: "선택 입력", en: "Optional" },
  "common.privacy": { ko: "개인정보처리방침", en: "Privacy Policy" },
  "common.openApp": { ko: "앱 열기", en: "Open app" },
  "common.days": { ko: "{count}일", en: "{count} days" },
  "common.peopleCount": { ko: "{count}명", en: "{count}" },

  "role.owner": { ko: "소유자", en: "Owner" },
  "role.editor": { ko: "편집자", en: "Editor" },
  "role.viewer": { ko: "뷰어", en: "Viewer" },

  // ---------------------------------------------------------------- landing
  "landing.feature.drag.title": { ko: "드래그로 일정 추가", en: "Drag to add" },
  "landing.feature.drag.body": {
    ko: "시간표를 드래그하면 바로 일정이 생겨요. 복잡한 입력 없이 즉시 시작.",
    en: "Drag across the grid and a schedule appears. No forms, no setup."
  },
  "landing.feature.dates.title": { ko: "필요한 날짜만", en: "Only the dates you need" },
  "landing.feature.dates.body": {
    ko: "일주일 틀이나 여행·MT 기간처럼, 원하는 날짜만 골라 시간표를 만들어요.",
    en: "Start from a weekly template, or pick the exact dates of a trip or event."
  },
  "landing.feature.collab.title": { ko: "함께 편집", en: "Edit together" },
  "landing.feature.collab.body": {
    ko: "링크 하나로 초대하면 같은 시간표를 함께 채워나갈 수 있어요.",
    en: "Send one invite link and fill in the same timetable together."
  },
  "landing.feature.share.title": { ko: "링크로 공유", en: "Share anywhere" },
  "landing.feature.share.body": {
    ko: "PNG·PDF로 내보내거나 링크만 보내 누구에게나 보여줄 수 있어요.",
    en: "Export to PNG or PDF, or just send a link anyone can open."
  },
  "landing.hero.brand": { ko: "플래너 투게더", en: "Planner Together" },
  "landing.hero.line1": { ko: "함께 만드는", en: "Timetables you" },
  "landing.hero.line2": { ko: "공유 시간표", en: "build together" },
  "landing.hero.body": {
    ko: "드래그로 만들고 링크 하나로 공유하세요. 여행·MT·스터디·프로젝트까지, 필요한 날짜만 골라 함께 채우는 시간표.",
    en: "Drag to build, share with one link. Trips, study groups, projects — pick the dates that matter and fill them in together."
  },
  "landing.cta.start": { ko: "무료로 시작하기", en: "Start for free" },
  "landing.cta.mine": { ko: "내 시간표로 이동", en: "Go to my timetables" },
  "landing.final.title": {
    ko: "이제 같이 계획해볼까요?",
    en: "Ready to plan it together?"
  },
  "landing.final.body": {
    ko: "필요한 날짜만 골라 드래그로 채우고, 링크 하나로 공유하세요. 계정 없이 먼저 만들어볼 수도 있어요.",
    en: "Pick just the dates you need, drag to fill them in, and share with one link. You can try it without an account first."
  },
  "landing.final.guest": { ko: "로그인 없이 체험하기", en: "Try it without an account" },
  "landing.how.eyebrow": { ko: "어떻게 쓰나요", en: "How it works" },
  "landing.how.title": {
    ko: "네 가지만 알면 끝이에요",
    en: "Four things, that's it"
  },
  "landing.detail.drag.body": {
    ko: "시간표 위에서 마우스를 끌면 그 자리에 바로 일정이 생겨요. 시작·종료 시간을 따로 입력할 필요 없이, 끌어서 놓기만 하면 됩니다.",
    en: "Drag across the grid and a schedule appears right there. No typing start and end times — just drag and drop."
  },
  "landing.detail.dates.body": {
    ko: "일주일 기본 틀로 바로 시작하거나, 달력에서 여행·행사 기간을 골라 필요한 날짜만 담아요. 빈 날짜로 지저분해지지 않아요.",
    en: "Start from a weekly template, or pick a trip's dates on the calendar — only the days you need, no empty clutter."
  },
  "landing.detail.collab.body": {
    ko: "초대 링크 하나로 친구를 부르면 같은 시간표를 실시간으로 함께 채워요. 누가 무엇을 바꿔도 모두의 화면에 바로 반영됩니다.",
    en: "Invite friends with one link and fill the same timetable together, live. Every change shows up for everyone instantly."
  },
  "landing.detail.share.body": {
    ko: "완성한 시간표는 링크로 보내거나 PNG·PDF·엑셀로 내보낼 수 있어요. 계정이 없는 사람에게도 보여줄 수 있습니다.",
    en: "Send the finished timetable as a link, or export it to PNG, PDF, or Excel. Even people without an account can view it."
  },

  // ---------------------------------------------------------------- auth
  "auth.signin.title": { ko: "로그인", en: "Log in" },
  "auth.signup.title": { ko: "회원가입", en: "Sign up" },
  "auth.signin.subtitle": {
    ko: "이메일과 비밀번호로 로그인하세요.",
    en: "Log in with your email and password."
  },
  "auth.signup.subtitle": {
    ko: "이메일과 비밀번호로 계정을 만들어요.",
    en: "Create an account with your email and password."
  },
  "auth.email": { ko: "이메일", en: "Email" },
  "auth.password": { ko: "비밀번호", en: "Password" },
  "auth.password.placeholder": { ko: "6자 이상", en: "At least 6 characters" },
  "auth.consent.label": {
    ko: "개인정보 수집·이용에 동의합니다.",
    en: "I agree to the collection and use of my personal data."
  },
  "auth.consent.required": { ko: "(필수)", en: "(required)" },
  "auth.consent.body": {
    ko: "이메일과 작성한 시간표가 저장되며, 서비스 운영을 위해 Supabase·Vercel에 처리를 위탁해요.",
    en: "Your email and timetables are stored, and processing is handled by Supabase and Vercel on our behalf."
  },
  "auth.submitting": { ko: "처리 중...", en: "Working…" },
  "auth.signup.submit": { ko: "가입하기", en: "Create account" },
  "auth.toSignup": { ko: "계정이 없으신가요? ", en: "No account yet? " },
  "auth.toSignin": { ko: "이미 계정이 있으신가요? ", en: "Already have an account? " },
  "auth.error.notConfigured": {
    ko: "Supabase 환경변수를 설정해주세요.",
    en: "Supabase environment variables are not set."
  },
  "auth.error.shortPassword": {
    ko: "비밀번호는 6자 이상이어야 해요.",
    en: "Password must be at least 6 characters."
  },
  "auth.error.consent": {
    ko: "개인정보 수집·이용에 동의해주세요.",
    en: "Please agree to the collection and use of your personal data."
  },
  "auth.error.badCredentials": {
    ko: "이메일 또는 비밀번호가 올바르지 않아요.",
    en: "That email or password is incorrect."
  },
  "auth.error.alreadyRegistered": {
    ko: "이미 가입된 이메일이에요. 로그인해주세요.",
    en: "That email is already registered. Please log in."
  },
  "auth.error.generic": {
    ko: "문제가 생겼어요. 다시 시도해주세요.",
    en: "Something went wrong. Please try again."
  },
  "account.page.open": { ko: "마이페이지 열기", en: "Open account settings" },
  "account.page.title": { ko: "마이페이지", en: "My account" },
  "account.page.subtitle": {
    ko: "계정 정보와 보안 설정을 관리하세요.",
    en: "Manage your account information and security settings."
  },
  "account.page.email": { ko: "로그인 이메일", en: "Login email" },
  "account.menu.password": { ko: "비밀번호 변경", en: "Change password" },
  "account.menu.delete": { ko: "회원 탈퇴", en: "Close account" },
  "account.change.title": { ko: "비밀번호 변경", en: "Change password" },
  "account.change.body": {
    ko: "현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.",
    en: "Confirm your current password, then choose a new one."
  },
  "account.danger.title": { ko: "회원 탈퇴", en: "Close your account" },
  "account.danger.body": {
    ko: "계정과 개인정보를 삭제합니다. 혼자 쓰던 시간표는 함께 삭제되고, 다른 참여자가 있는 시간표는 남은 참여자에게 소유권이 넘어갑니다. 되돌릴 수 없습니다.",
    en: "Deletes your account and personal data. Timetables you were using alone go with it; ones with other members are handed over to a remaining member. This can't be undone."
  },
  "account.danger.cta": { ko: "회원 탈퇴", en: "Close account" },
  "account.confirm.title": { ko: "정말 탈퇴하시겠어요?", en: "Close your account?" },
  "account.confirm.body": {
    ko: "확인을 위해 아래에 {word} 를 입력해 주세요.",
    en: "Type {word} below to confirm."
  },
  "account.confirm.word": { ko: "탈퇴", en: "DELETE" },
  "account.password.label": { ko: "현재 비밀번호", en: "Current password" },
  "account.password.placeholder": {
    ko: "현재 비밀번호를 입력해 주세요",
    en: "Enter your current password"
  },
  "account.password.incorrect": {
    ko: "비밀번호가 올바르지 않아요.",
    en: "That password is incorrect."
  },
  "account.summary.loading": { ko: "탈퇴 결과를 확인하고 있어요...", en: "Checking what will change..." },
  "account.summary.delete": { ko: "함께 삭제되는 개인 시간표", en: "Personal timetables deleted" },
  "account.summary.transfer": {
    ko: "소유권이 이전되는 공동 시간표",
    en: "Shared timetables transferred"
  },
  "account.summary.failed": {
    ko: "시간표 현황을 불러오지 못했어요. 탈퇴를 진행하면 서버에서 다시 확인합니다.",
    en: "We couldn't load the timetable summary. The server will check it again before deletion."
  },
  "account.confirm.submit": { ko: "영구 삭제", en: "Delete permanently" },
  "account.confirm.working": { ko: "삭제 중...", en: "Deleting…" },
  "account.deleted": { ko: "계정을 삭제했어요.", en: "Your account has been deleted." },
  "account.deleteFailed": {
    ko: "탈퇴 처리에 실패했어요. 잠시 후 다시 시도해 주세요.",
    en: "We couldn't close the account. Please try again shortly."
  },

  "auth.forgot.link": { ko: "비밀번호를 잊으셨나요?", en: "Forgot your password?" },
  "auth.forgot.title": { ko: "비밀번호 재설정", en: "Reset your password" },
  "auth.forgot.subtitle": {
    ko: "가입한 이메일로 재설정 링크를 보내드려요.",
    en: "We'll email you a link to set a new password."
  },
  "auth.forgot.submit": { ko: "재설정 링크 보내기", en: "Send reset link" },
  "auth.forgot.sending": { ko: "보내는 중...", en: "Sending…" },
  "auth.forgot.sent": {
    ko: "해당 이메일로 가입된 계정이 있다면 재설정 링크를 보냈어요. 메일함을 확인해 주세요.",
    en: "If an account exists for that email, we've sent a reset link. Please check your inbox."
  },
  "auth.forgot.back": { ko: "← 로그인으로 돌아가기", en: "← Back to log in" },
  "auth.reset.title": { ko: "새 비밀번호 설정", en: "Set a new password" },
  "auth.reset.subtitle": {
    ko: "새로 사용할 비밀번호를 입력해 주세요.",
    en: "Enter the password you'd like to use from now on."
  },
  "auth.reset.newPassword": { ko: "새 비밀번호", en: "New password" },
  "auth.reset.confirmPassword": { ko: "새 비밀번호 확인", en: "Confirm new password" },
  "auth.reset.submit": { ko: "비밀번호 변경", en: "Change password" },
  "auth.reset.saving": { ko: "변경 중...", en: "Saving…" },
  "auth.reset.done": { ko: "비밀번호를 변경했어요.", en: "Your password has been changed." },
  "auth.reset.mismatch": {
    ko: "두 비밀번호가 서로 달라요.",
    en: "The two passwords don't match."
  },
  "auth.reset.expired": {
    ko: "링크가 만료되었거나 이미 사용되었어요. 재설정을 다시 요청해 주세요.",
    en: "That link has expired or was already used. Please request a new one."
  },

  "auth.guest.divider": { ko: "또는", en: "or" },
  "auth.guest.cta": { ko: "로그인 없이 체험하기", en: "Try it without an account" },
  "auth.guest.hint": {
    ko: "계정 없이 시간표 하나를 바로 만들어볼 수 있어요. 대신 링크를 꼭 저장해두세요.",
    en: "Build one timetable right away, no account needed. Just be sure to save your link."
  },
  "auth.guest.starting": { ko: "시간표를 만드는 중...", en: "Creating your timetable…" },
  "auth.guest.failed": {
    ko: "체험을 시작하지 못했어요. 다시 시도해주세요.",
    en: "Couldn't start the trial. Please try again."
  },

  // ---------------------------------------------------------------- guest mode
  "guest.badge": { ko: "체험 중", en: "Trial" },
  "guest.projectTitle": { ko: "내 시간표", en: "My timetable" },
  "guest.banner.title": { ko: "링크를 꼭 저장해두세요", en: "Save this link" },
  "guest.banner.body": {
    ko: "로그인 없이 체험 중이에요. 이 링크가 시간표에 다시 들어올 수 있는 유일한 방법이라, 잃어버리면 되찾을 수 없어요. 북마크하거나 나에게 보내두세요. 계정을 만들면 시간표를 여러 개 만들고 어느 기기에서든 열 수 있어요.",
    en: "You're trying Planner Together without an account. This link is the only way back into your timetable — if you lose it, it can't be recovered. Bookmark it or send it to yourself. Create an account to make more timetables and open them from any device."
  },
  "grid.zoomIn": { ko: "확대", en: "Zoom in" },
  "grid.zoomOut": { ko: "축소", en: "Zoom out" },
  "grid.zoomReset": { ko: "기본 배율로", en: "Reset zoom" },

  "guest.banner.copy": { ko: "링크 복사", en: "Copy link" },
  "guest.banner.collapse": { ko: "안내 접기", en: "Collapse notice" },
  "guest.banner.expand": { ko: "안내 펼치기", en: "Expand notice" },
  "guest.banner.signup": { ko: "계정 만들기", en: "Create an account" },

  "auth.signupComplete": {
    ko: "가입이 완료됐어요. 이제 로그인해주세요.",
    en: "Account created. You can log in now."
  },

  // ---------------------------------------------------------------- dashboard
  "dashboard.title": { ko: "대시보드", en: "Dashboard" },
  "dashboard.subtitle": {
    ko: "함께 만드는 공유 시간표 목록이에요.",
    en: "Timetables you're building with others."
  },
  "dashboard.new": { ko: "새 시간표", en: "New timetable" },
  "dashboard.projectsView": { ko: "시간표 목록", en: "Timetables" },
  "dashboard.calendar": { ko: "전체 일정", en: "All schedules" },
  "dashboard.today": { ko: "오늘", en: "Today" },
  "dashboard.previousMonth": { ko: "이전 달", en: "Previous month" },
  "dashboard.nextMonth": { ko: "다음 달", en: "Next month" },
  "dashboard.noSchedulesForDay": { ko: "이날은 일정이 없어요.", en: "No schedules for this day." },
  "dashboard.ongoingProjects": { ko: "진행 중인 프로젝트", en: "Ongoing projects" },
  "dashboard.upcomingProjects": { ko: "다가올 프로젝트", en: "Upcoming projects" },
  "dashboard.pastProjects": { ko: "지난 프로젝트", en: "Past projects" },
  "dashboard.noOngoingProjects": {
    ko: "현재 진행 중인 프로젝트가 없어요.",
    en: "No projects are currently in progress."
  },
  "dashboard.noUpcomingProjects": {
    ko: "다가올 프로젝트가 없어요.",
    en: "No upcoming projects."
  },
  "dashboard.noPastProjects": {
    ko: "지난 프로젝트가 없어요.",
    en: "No past projects."
  },
  "dashboard.loadFailed": {
    ko: "프로젝트를 불러오지 못했어요.",
    en: "Couldn't load your timetables."
  },
  "dashboard.loadFailedRetry": {
    ko: "프로젝트를 불러오지 못했어요. 새로고침해 보세요.",
    en: "Couldn't load your timetables. Try refreshing."
  },
  "dashboard.empty": {
    ko: "아직 만든 일정표가 없어요. 첫 프로젝트를 만들어보세요.",
    en: "No timetables yet. Create your first one."
  },

  // ---------------------------------------------------------------- project card
  "card.confirmDelete": {
    ko: "\"{title}\" 시간표를 삭제할까요? 되돌릴 수 없어요.",
    en: "Delete the timetable \"{title}\"? This can't be undone."
  },
  "card.deleted": { ko: "시간표를 삭제했어요.", en: "Timetable deleted." },
  "card.deleteFailed": {
    ko: "삭제하지 못했어요. 소유자만 삭제할 수 있어요.",
    en: "Couldn't delete it. Only the owner can."
  },
  "card.renameFailed": { ko: "이름을 변경하지 못했어요.", en: "Couldn't rename it." },
  "card.renameHint": { ko: "Enter로 저장 · Esc로 취소", en: "Enter to save · Esc to cancel" },
  "card.noDates": { ko: "아직 날짜가 없어요", en: "No dates yet" },
  "card.scheduleCount": { ko: "일정 {count}개", en: "{count} schedules" },
  "card.contextHint": { ko: "우클릭 메뉴", en: "Right-click for menu" },

  // ---------------------------------------------------------------- create / setup
  "setup.chooseKind": { ko: "어떤 시간표를 만들까요?", en: "What kind of timetable?" },
  "setup.chooseKindSub": {
    ko: "드래그로 만들고 링크 하나로 공유하는 시간표",
    en: "Drag to build it, share it with a single link."
  },
  "setup.pickDates": { ko: "날짜 직접 선택", en: "Pick specific dates" },
  "setup.pickDatesBody": {
    ko: "기간을 골라 여행·MT·행사 일정에 맞는 날짜만 추가",
    en: "Choose a range and add only the days your trip or event covers."
  },
  "setup.pickDatesCta": { ko: "기간 선택하기 →", en: "Choose dates →" },
  "setup.weekly": { ko: "일주일 시간표 만들기", en: "Weekly timetable" },
  "setup.weeklyBody": {
    ko: "날짜 입력 없이 기본 틀로 즉시 시작",
    en: "Start right away with a standard week — no dates needed."
  },
  "setup.startMonday": { ko: "월요일 시작", en: "Starts Monday" },
  "setup.startSunday": { ko: "일요일 시작", en: "Starts Sunday" },
  "setup.startAsIs": { ko: "이대로 시작하기", en: "Start with this" },
  "setup.chooseRange": { ko: "기간을 선택하세요", en: "Choose a date range" },
  "setup.chooseRangeSub": {
    ko: "시작일과 종료일을 차례로 클릭하세요.",
    en: "Click the start date, then the end date."
  },
  "setup.nameIt": { ko: "시간표 이름을 정해주세요", en: "Name your timetable" },
  "setup.namePlaceholder": {
    ko: "예: 유럽 여행, 동아리 MT",
    en: "e.g. Europe trip, team offsite"
  },
  "setup.description": { ko: "설명 (선택)", en: "Description (optional)" },
  "setup.descriptionPlaceholder": {
    ko: "함께 보는 사람들을 위한 간단한 설명",
    en: "A short note for everyone sharing this"
  },
  "setup.creating": { ko: "만드는 중...", en: "Creating…" },
  "setup.create": { ko: "시간표 만들기", en: "Create timetable" },
  "setup.nameRequired": { ko: "시간표 이름을 입력해주세요.", en: "Please enter a name." },
  "setup.created": { ko: "시간표를 만들었어요.", en: "Timetable created." },
  "setup.createFailed": {
    ko: "시간표를 만들지 못했어요. 다시 시도해주세요.",
    en: "Couldn't create the timetable. Please try again."
  },
  "setup.defaultNameWeeklyMon": {
    ko: "이번 주 월~일 일주일 시간표",
    en: "This week (Mon–Sun)"
  },
  "setup.defaultNameWeeklySun": {
    ko: "이번 주 일~토 일주일 시간표",
    en: "This week (Sun–Sat)"
  },
  "setup.defaultNameRange": { ko: "{start} ~ {end} 시간표", en: "{start} – {end}" },
  "setup.noDatesYet": {
    ko: "아직 선택된 날짜가 없어요. 편집 권한이 있는 멤버가 날짜를 추가하면 시간표가 표시됩니다.",
    en: "No dates selected yet. Once a member with edit access adds some, the timetable appears here."
  },
  "setup.weeklyCreatedMon": {
    ko: "월~일 일주일 시간표를 만들었어요.",
    en: "Created a Mon–Sun weekly timetable."
  },
  "setup.weeklyCreatedSun": {
    ko: "일~토 일주일 시간표를 만들었어요.",
    en: "Created a Sun–Sat weekly timetable."
  },
  "setup.rangeCreated": {
    ko: "{count}일짜리 시간표를 만들었어요.",
    en: "Created a {count}-day timetable."
  },
  "setup.datesFailed": {
    ko: "날짜를 추가하지 못했어요. 다시 시도해주세요.",
    en: "Couldn't add the dates. Please try again."
  },

  // ---------------------------------------------------------------- calendar
  "cal.prevMonth": { ko: "이전 달", en: "Previous month" },
  "cal.nextMonth": { ko: "다음 달", en: "Next month" },
  "cal.maxRange": {
    ko: "최대 {count}일까지 선택할 수 있어요.",
    en: "You can select up to {count} days."
  },
  "cal.clickStart": { ko: "시작일을 클릭하세요", en: "Click a start date" },
  "cal.clickEnd": { ko: "{start} ~ 종료일을 클릭하세요", en: "{start} — now click an end date" },
  "cal.rangeSummary": { ko: "{start} ~ {end} ({count}일)", en: "{start} – {end} ({count} days)" },

  // ---------------------------------------------------------------- sidebar
  "sidebar.sharedTimetable": { ko: "공유 시간표", en: "Shared timetable" },
  "sidebar.participants": { ko: "참여자", en: "Members" },
  "sidebar.selectedDates": { ko: "선택한 날짜", en: "Selected dates" },
  "dates.edit": { ko: "날짜 수정", en: "Edit dates" },
  "dates.editTitle": { ko: "날짜 수정", en: "Edit dates" },
  "dates.editSubtitle": {
    ko: "시작일과 종료일을 다시 골라주세요. 그대로 남는 날짜의 일정은 유지돼요.",
    en: "Pick a new start and end date. Schedules on dates that stay are kept."
  },
  "dates.save": { ko: "날짜 변경", en: "Update dates" },
  "dates.saving": { ko: "변경하는 중...", en: "Updating…" },
  "dates.updated": { ko: "날짜를 변경했어요.", en: "Dates updated." },
  "dates.updateFailed": {
    ko: "날짜를 변경하지 못했어요.",
    en: "Couldn't update the dates."
  },
  "dates.dropWarning": {
    ko: "{days}일이 범위에서 빠지고, 거기 있던 일정 {items}개가 함께 삭제돼요.",
    en: "{days} date(s) fall outside the new range; {items} schedule(s) on them will be deleted."
  },
  "dates.dropWarningEmpty": {
    ko: "{days}일이 범위에서 빠져요. 해당 날짜에는 일정이 없어요.",
    en: "{days} date(s) fall outside the new range. Nothing is scheduled on them."
  },
  "sidebar.notes": { ko: "메모", en: "Notes" },
  "sidebar.scheduleMemos": { ko: "일정에 적은 메모", en: "Notes on schedules" },
  "sidebar.renameHint": { ko: "클릭해서 이름 수정", en: "Click to rename" },
  "sidebar.memoEmpty": {
    ko: "일정 상세에 메모를 적으면 여기에 모여요.",
    en: "Notes you add to a schedule collect here."
  },
  "notes.placeholder": { ko: "준비물, 예산, 링크 등", en: "Packing list, budget, links…" },
  "notes.adding": { ko: "추가 중...", en: "Adding…" },
  "notes.add": { ko: "메모 추가", en: "Add note" },
  "notes.empty": { ko: "아직 메모가 없어요.", en: "No notes yet." },
  "notes.editHint": { ko: "클릭해서 수정", en: "Click to edit" },
  "notes.deleteLabel": { ko: "메모 삭제", en: "Delete note" },
  "notes.addFailed": { ko: "메모를 추가하지 못했어요.", en: "Couldn't add the note." },
  "notes.saveFailed": { ko: "메모를 저장하지 못했어요.", en: "Couldn't save the note." },
  "notes.deleted": { ko: "메모를 삭제했어요.", en: "Note deleted." },
  "notes.deleteFailed": { ko: "메모를 삭제하지 못했어요.", en: "Couldn't delete the note." },

  // ---------------------------------------------------------------- budget
  "budget.title": { ko: "예산", en: "Budget" },
  "budget.total": { ko: "전체 예산", en: "Total budget" },
  "budget.totalPlaceholder": { ko: "예산 입력", en: "Set an amount" },
  "budget.currency": { ko: "통화", en: "Currency" },
  "budget.spent": { ko: "사용", en: "Spent" },
  "budget.remaining": { ko: "남음", en: "Left" },
  "budget.over": { ko: "초과", en: "Over" },
  "budget.percentUsed": { ko: "{percent}%", en: "{percent}%" },
  "budget.noBudget": {
    ko: "전체 예산을 정하면 얼마나 남았는지 보여드릴게요.",
    en: "Set a total budget to see what's left."
  },
  "budget.fromSchedules": { ko: "일정에 적은 금액", en: "From schedules" },
  "budget.otherSpending": { ko: "그 밖의 지출", en: "Other spending" },
  "budget.itemCount": { ko: "{count}건", en: "{count}" },
  "budget.expenseLabelPlaceholder": { ko: "택시비, 숙소 보증금 등", en: "Taxi, deposit, …" },
  "budget.expenseAmountPlaceholder": { ko: "금액", en: "Amount" },
  "budget.addExpense": { ko: "지출 추가", en: "Add spending" },
  "budget.adding": { ko: "추가 중...", en: "Adding…" },
  "budget.expenseEmpty": {
    ko: "일정 밖에서 쓴 돈을 여기에 더할 수 있어요.",
    en: "Add money spent outside the timetable here."
  },
  "budget.expenseEditHint": { ko: "클릭해서 수정", en: "Click to edit" },
  "budget.expenseDeleteLabel": { ko: "지출 삭제", en: "Delete spending" },
  "budget.expenseDeleted": { ko: "지출을 삭제했어요.", en: "Spending deleted." },
  "budget.addFailed": { ko: "지출을 추가하지 못했어요.", en: "Couldn't add the spending." },
  "budget.saveFailed": { ko: "예산을 저장하지 못했어요.", en: "Couldn't save the budget." },
  "budget.deleteFailed": { ko: "지출을 삭제하지 못했어요.", en: "Couldn't delete the spending." },
  "budget.invalidAmount": { ko: "금액을 다시 확인해 주세요.", en: "Check the amount." },
  "budget.notMigrated": {
    ko: "예산 기능을 쓰려면 데이터베이스에 015_budget 마이그레이션을 적용해야 해요.",
    en: "Apply the 015_budget migration to this database to use budgets."
  },

  // ------------------------------------------------------------------ chat
  "chat.title": { ko: "실시간 채팅", en: "Live chat" },
  "chat.open": { ko: "채팅 열기", en: "Open chat" },
  "chat.openHint": { ko: "/ 를 눌러도 열려요", en: "Or press /" },
  "chat.you": { ko: "나", en: "You" },
  "chat.placeholder": { ko: "메시지 입력", en: "Message" },
  "chat.connecting": { ko: "연결 중...", en: "Connecting…" },
  "chat.send": { ko: "보내기", en: "Send" },
  "chat.empty": {
    ko: "지금 이 시간표를 보고 있는 사람끼리 나누는 대화예요. 저장되지 않아 새로고침하면 사라집니다.",
    en: "A conversation between everyone viewing this timetable right now. Nothing is saved — it disappears on refresh."
  },

  // ---------------------------------------------------------------- members
  "members.roleChanged": { ko: "권한을 변경했어요.", en: "Role updated." },
  "members.roleChangeFailed": { ko: "권한을 변경하지 못했어요.", en: "Couldn't update the role." },
  "members.changeRoleLabel": { ko: "멤버 권한 변경", en: "Change member role" },

  // ---------------------------------------------------------------- share
  "share.title": { ko: "시간표 공유", en: "Share timetable" },
  "share.subtitle": {
    ko: "링크를 복사해서 함께할 사람에게 보내주세요.",
    en: "Copy a link and send it to the people joining you."
  },
  "share.inviteLabel": { ko: "초대 링크", en: "Invite link" },
  "share.inviteHint": {
    ko: "함께할 사람에게 보낼 링크예요",
    en: "the link to send to people joining you"
  },
  "share.inviteExplainer": {
    ko: "초대 링크를 연 사람은 로그인(또는 회원가입) 후 보기 전용(뷰어)으로 참여해요. 편집을 맡기려면 참여한 뒤 소유자가 참여자 목록에서 권한을 바꿔주면 됩니다.",
    en: "Anyone opening the invite link joins as a viewer after logging in or signing up. To let them edit, the owner changes their role in the member list once they've joined."
  },
  "share.projectLabel": { ko: "프로젝트 링크", en: "Project link" },
  "share.projectHint": {
    ko: "로그인 없이 읽고, 멤버는 로그인 후 편집할 수 있어요",
    en: "opens read-only without a login; members can edit after signing in"
  },
  "share.copied": { ko: "링크를 복사했어요.", en: "Link copied." },
  "share.button": { ko: "공유", en: "Share" },
  "share.openCta": { ko: "프로젝트 공유하기", en: "Share project" },
  "export.excel": { ko: "엑셀", en: "Excel" },
  "export.notReady": { ko: "아직 내보낼 준비가 안 됐어요.", en: "Nothing to export yet." },
  "export.open": { ko: "내보내기", en: "Export" },
  "export.title": { ko: "시간표 내보내기", en: "Export timetable" },
  "export.subtitle": {
    ko: "원하는 형식을 골라주세요.",
    en: "Pick a format to export."
  },
  "export.tile.png": { ko: "이미지", en: "Image" },
  "export.tile.pdf": { ko: "PDF", en: "PDF" },
  "export.tile.excel": { ko: "엑셀", en: "Excel" },

  // ---------------------------------------------------------------- map
  "map.title": { ko: "이동 경로", en: "Route" },
  "map.subtitle": {
    ko: "위치를 입력한 일정을 시간 순서대로 지도에 이어서 보여줘요.",
    en: "Schedules with a location, pinned and joined in time order."
  },
  "map.previousDay": { ko: "이전 날짜", en: "Previous day" },
  "map.nextDay": { ko: "다음 날짜", en: "Next day" },
  "map.noLocations": {
    ko: "이 날짜에는 위치가 입력된 일정이 없어요. 일정의 위치 칸에 주소나 장소 이름을 넣어주세요.",
    en: "No schedule on this day has a location yet. Add an address or place name to a schedule's location field."
  },
  "map.noKey": {
    ko: "지도를 쓰려면 구글 지도 API 키가 필요해요. NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 환경 변수를 설정해주세요.",
    en: "The map needs a Google Maps API key. Set the NEXT_PUBLIC_GOOGLE_MAPS_API_KEY environment variable."
  },
  "map.failed": {
    ko: "지도를 불러오지 못했어요. 잠시 후 다시 시도해주세요.",
    en: "Couldn't load the map. Please try again in a moment."
  },
  "map.notFound": { ko: "주소 못 찾음", en: "address not found" },
  "map.noneFound": {
    ko: "입력된 위치를 지도에서 하나도 찾지 못했어요. 주소를 더 구체적으로 적어주세요.",
    en: "None of the locations could be found on the map. Try more specific addresses."
  },
  "map.notFoundHint": {
    ko: "{count}개 일정의 위치를 지도에서 찾지 못했어요. 더 구체적인 주소로 바꾸면 표시됩니다.",
    en: "Couldn't place {count} schedule(s) on the map. A more specific address will fix it."
  },

  // ---------------------------------------------------------------- invite
  "invite.eyebrow": { ko: "플래너 투게더 초대", en: "Planner Together invitation" },
  "invite.joining": { ko: "참여하는 중...", en: "Joining…" },
  "invite.joiningBody": {
    ko: "잠시만요, 시간표에 참여자로 등록하고 있어요.",
    en: "One moment — adding you to the timetable."
  },
  "invite.needLogin": { ko: "로그인하고 참여하기", en: "Log in to join" },
  "invite.needLoginBody": {
    ko: "참여하려면 계정이 필요해요. 로그인하거나 회원가입을 마치면 이 시간표에 자동으로 참여됩니다.",
    en: "You'll need an account to join. Once you log in or sign up, you'll be added automatically."
  },
  "invite.loginOrSignup": { ko: "로그인 · 회원가입", en: "Log in · Sign up" },
  "invite.failed": { ko: "참여하지 못했어요", en: "Couldn't join" },
  "invite.failedBody": {
    ko: "초대 링크가 올바르지 않거나 만료됐어요. 초대한 분에게 링크를 다시 받아주세요.",
    en: "This invite link is invalid or expired. Ask whoever invited you for a new one."
  },
  "invite.goDashboard": { ko: "대시보드로 이동", en: "Go to dashboard" },

  // ---------------------------------------------------------------- embed
  "embed.readOnly": { ko: "읽기 전용", en: "Read only" },
  "embed.openProject": { ko: "프로젝트 열기", en: "Open project" },
  "embed.empty": { ko: "아직 선택한 날짜가 없어요.", en: "No dates have been selected yet." },

  // ---------------------------------------------------------------- project page
  "project.notFound": { ko: "시간표를 찾을 수 없어요", en: "Timetable not found" },
  "project.notFoundBody": {
    ko: "이 시간표가 없거나 아직 참여자가 아니에요. 이 주소 대신 초대 링크(/invite/…)를 받아서 열어주세요.",
    en: "It doesn't exist, or you haven't joined yet. Open an invite link (/invite/…) instead of this address."
  },
  "project.loadingBody": { ko: "시간표를 불러오고 있어요.", en: "Loading the timetable." },
  "project.loadFailed": {
    ko: "이 시간표를 불러오지 못했어요.",
    en: "Couldn't load this timetable."
  },
  "project.backToDashboard": { ko: "대시보드로 돌아가기", en: "Back to dashboard" },
  "project.goDashboard": { ko: "대시보드로 이동", en: "Go to dashboard" },

  // ---------------------------------------------------------------- timetable
  "grid.tabGrid": { ko: "시간 그리드", en: "Time grid" },
  "grid.tabMonth": { ko: "월간 달력", en: "Month" },
  "grid.weekStart": { ko: "주 시작", en: "Week starts" },
  "grid.mon": { ko: "월", en: "Mon" },
  "grid.sun": { ko: "일", en: "Sun" },
  "grid.allDay": { ko: "종일", en: "All-day" },
  "grid.emptyTitle": {
    ko: "원하는 날짜를 추가해서 시간표를 시작하세요.",
    en: "Add some dates to start building your timetable."
  },
  "grid.newSchedule": { ko: "새 일정", en: "New schedule" },
  "grid.draftPlaceholder": {
    ko: "일정 이름 (비우면 취소)",
    en: "Schedule name (leave empty to cancel)"
  },
  "grid.allDayPlaceholder": {
    ko: "종일 일정 (비우면 취소)",
    en: "All-day schedule (leave empty to cancel)"
  },
  "grid.scheduleSaveFailed": { ko: "일정을 저장하지 못했어요.", en: "Couldn't save the schedule." },
  "grid.allDaySaveFailed": {
    ko: "종일 일정을 저장하지 못했어요.",
    en: "Couldn't save the all-day schedule."
  },
  "grid.moveFailed": { ko: "일정을 옮기지 못했어요", en: "Couldn't move the schedule" },
  "grid.resizeFailed": { ko: "길이를 바꾸지 못했어요", en: "Couldn't resize the schedule" },
  "grid.undoSuccess": { ko: "직전 편집을 되돌렸어요.", en: "Undid the last change." },
  "grid.undoFailed": { ko: "직전 편집을 되돌리지 못했어요.", en: "Couldn't undo the last change." },
  "grid.wakeTime": { ko: "기상 시간", en: "Wake time" },
  "grid.wakeMode": { ko: "기상 설정", en: "Set wake time" },
  "grid.setWakeTime": { ko: "기상 시간 설정", en: "Set wake time" },
  "grid.openMap": { ko: "이동 경로 지도", en: "Route map" },
  "grid.saveWakeTime": { ko: "저장", en: "Save" },
  "grid.savingWakeTime": { ko: "저장 중...", en: "Saving..." },
  "grid.clearWakeTime": { ko: "기상 시간 해제", en: "Clear wake time" },
  "grid.sleepTime": { ko: "수면", en: "Sleep" },
  "grid.sleepDuration": { ko: "수면 시간", en: "Sleep duration" },
  "grid.sleepDurationHours": { ko: "{hours}시간", en: "{hours} hours" },
  "grid.wakeTimeSaveFailed": {
    ko: "기상 시간을 저장하지 못했어요.",
    en: "Couldn't save the wake time."
  },

  // ---------------------------------------------------------------- detail panel
  "detail.title": { ko: "일정 상세", en: "Schedule details" },
  "detail.empty": {
    ko: "일정을 클릭하면 여기에서 바로 수정할 수 있어요.",
    en: "Click a schedule to edit it right here."
  },
  "detail.date": { ko: "날짜", en: "Date" },
  "detail.startDate": { ko: "시작 날짜", en: "Start date" },
  "detail.endDate": { ko: "종료 날짜", en: "End date" },
  "detail.start": { ko: "시작", en: "Starts" },
  "detail.end": { ko: "종료", en: "Ends" },
  "detail.location": { ko: "장소", en: "Location" },
  "detail.amount": { ko: "금액", en: "Amount" },
  "detail.amountPlaceholder": { ko: "예: 25000", en: "e.g. 25000" },
  "detail.memo": { ko: "메모", en: "Notes" },
  "detail.color": { ko: "색상", en: "Color" },
  "detail.colorLabel": { ko: "색상 {color}", en: "Color {color}" },
  "detail.deleteHint": {
    ko: "Delete 키로도 삭제할 수 있어요.",
    en: "You can also press Delete."
  },
  "detail.deleted": { ko: "일정을 삭제했어요.", en: "Schedule deleted." },
  "detail.deleteFailed": { ko: "일정을 삭제하지 못했어요.", en: "Couldn't delete the schedule." },
  "detail.saveFailed": { ko: "변경사항을 저장하지 못했어요.", en: "Couldn't save your changes." },
  "detail.endBeforeStart": {
    ko: "종료 시간은 시작 시간보다 뒤여야 해요.",
    en: "The end time has to be after the start time."
  },

  // ---------------------------------------------------------------- errors (thrown)
  "error.projectDeleteDenied": {
    ko: "삭제 권한이 없어요. 소유자만 삭제할 수 있어요.",
    en: "You don't have permission — only the owner can delete this."
  },
  "error.deleteDenied": { ko: "삭제 권한이 없어요.", en: "You don't have permission to delete this." },
  "error.scheduleDeleteDenied": {
    ko: "이 일정을 삭제할 권한이 없거나, 이미 삭제된 일정이에요.",
    en: "You can't delete this schedule, or it's already been deleted."
  },

  // ---------------------------------------------------------------- misc
  "feedback.label": { ko: "서비스 피드백", en: "Feedback" },
  "locale.switch": { ko: "언어", en: "Language" }
} as const;

export type MessageKey = keyof typeof messages;

export function isMessageKey(value: string): value is MessageKey {
  return value in messages;
}

// Kept in sync with LocaleProvider's storage key.
const STORAGE_KEY = "plantogether.locale";

/** Best-effort current locale for non-React code (stores, thrown errors). */
export function currentLocale(): "ko" | "en" {
  if (typeof window === "undefined") return "ko";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "ko" || stored === "en") return stored;
    return navigator.language.startsWith("ko") ? "ko" : "en";
  } catch {
    return "ko";
  }
}

/**
 * Translate outside React — for messages thrown from the store and surfaced
 * verbatim in a toast. Components should use the `useT` hook instead.
 */
export function translate(key: MessageKey, vars?: Record<string, string | number>) {
  const entry = messages[key];
  const text = entry[currentLocale()] ?? entry.ko;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match
  );
}
