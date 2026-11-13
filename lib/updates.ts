// The updates page and the dashboard's news line both read this list.
// Newest first. Each entry is what a user would notice, not how it was built.

export type Change = { title: string; body: string };
/** An example screen for a major update, from /public/updates. A phone
    screenshot is shown narrower so it doesn't run the page's length. */
export type UpdateImage = { src: string; width: number; height: number; phone?: boolean };
export type Release = { date: string; changes: { ko: Change; en: Change; image?: UpdateImage }[] };

export const RELEASES: Release[] = [
  {
    date: "2026-11-13",
    changes: [
      {
        ko: { title: "공유 링크 새로 만들기", body: "시간표 공유 창에서 소유자가 링크를 새로 만들 수 있어요. 내보낸 사람이 예전 링크로 다시 들어오지 못해요. 이미 참여한 사람은 그대로예요." },
        en: { title: "Make a new share link", body: "In the share window, a timetable's owner can now make a new link, so someone you removed can't come back through the old one. People already in the timetable stay." }
      },
      {
        ko: { title: "장소 검색으로 정확한 핀", body: "일정의 장소 칸에 이름을 입력하면 비슷한 장소가 주소와 함께 목록으로 떠요. 고르면 동선 지도에 그 위치 그대로 핀이 찍혀요. 지도의 핀이나 장소 카드에서 구글 지도로 바로 열 수도 있어요." },
        en: { title: "Search for a place to pin it exactly", body: "Type in an event's place field and matching places appear with their addresses. Pick one and the route map pins it right there. Pins and place cards also open in Google Maps." }
      }
    ]
  },
  {
    date: "2026-11-11",
    changes: [
      {
        ko: { title: "사진에서 보여줄 곳 정하기", body: "일정 사진 미리보기에서 보여주고 싶은 곳을 누르면, 일정 박스가 그 부분을 중심으로 사진을 보여줘요. 얼굴이나 건물이 잘리지 않게 맞출 수 있어요." },
        en: { title: "Choose what a photo shows", body: "Tap the spot you want in an event photo's preview and the event box centres the photo there, so faces and landmarks stay in frame." }
      }
    ]
  },
  {
    date: "2026-11-10",
    changes: [
      {
        ko: { title: "일정에 사진 넣기", body: "일정 색상을 고르는 곳에서 사진을 고르면 일정 박스 배경으로 보여요. 내보낸 PNG·PDF·HTML과 공유 링크에서도 그대로 보여요." },
        en: { title: "Photos on events", body: "Pick a photo where you choose an event's colour and it becomes the event box's background — in PNG, PDF and HTML exports and shared links too." },
        image: { src: "/updates/2026-11-10-schedule-photos-v5.webp", width: 1200, height: 1125 }
      },
      {
        ko: { title: "자정을 넘는 일정", body: "밤 11시부터 새벽 2시처럼 다음 날로 이어지는 일정을 하나로 만들 수 있어요." },
        en: { title: "Events past midnight", body: "An event can now run from one date into the next, like 11 pm to 2 am." }
      },
      {
        ko: { title: "종일 일정 ↔ 시간 일정 바꾸기", body: "일정 상세에서 종일 일정과 시간이 있는 일정을 서로 바꿀 수 있어요." },
        en: { title: "Switch all-day and timed", body: "Turn an all-day event into a timed one, or back, from its details." }
      },
      {
        ko: { title: "월간 달력에서 일정 추가", body: "월간 달력 보기에서도 원하는 날짜에 바로 일정을 넣을 수 있어요." },
        en: { title: "Add from the month view", body: "Add an event to any timetable date straight from the month view." }
      },
      {
        ko: { title: "사이드바 너비 조절", body: "PC에서 왼쪽 사이드바 경계를 끌어 넓히거나 좁힐 수 있어요." },
        en: { title: "Resizable sidebar", body: "On a computer, drag the left sidebar's edge to make it wider or narrower." }
      }
    ]
  },
  {
    date: "2026-11-05",
    changes: [
      {
        ko: { title: "날짜별 동선 지도", body: "날짜 칸의 지도 버튼을 누르면 그날 장소가 순서대로 번호 핀으로 지도에 나오고, 핀 사이가 선으로 이어져요." },
        en: { title: "Route map for each day", body: "The map button on a date shows that day's places as numbered pins, joined by lines in visiting order." },
        image: { src: "/updates/2026-11-05-route-map.webp", width: 1200, height: 865 }
      },
      {
        ko: { title: "폰에서 드래그로 일정 만들기", body: "휴대폰에서 빈 칸을 꾹 누른 뒤 끌면 일정이 바로 그려져요. 입력하는 이름도 저장된 일정과 같은 크기로 보여요." },
        en: { title: "Drag to add events on phones", body: "Press and hold an empty slot, then drag, to draw an event on a phone." }
      },
      {
        ko: { title: "길게 눌러 수정·삭제", body: "휴대폰에서 메모나 지출을 길게 누르면 수정·삭제 메뉴가 떠요." },
        en: { title: "Long-press to edit or delete", body: "On a phone, hold a note or an expense for an edit and delete menu." }
      },
      {
        ko: { title: "장소·메모 엔터로 저장", body: "일정의 장소와 메모 칸에서 엔터를 누르면 바로 저장돼요. 메모 줄바꿈은 Shift+엔터예요." },
        en: { title: "Enter saves place and memo", body: "Press Enter in an event's place or memo field to save. Shift+Enter starts a new line in the memo." }
      }
    ]
  },
  {
    date: "2026-11-03",
    changes: [
      {
        ko: { title: "할 일 메모", body: "메모를 할 일로 바꿔 체크하며 쓸 수 있어요. 준비물이나 예약할 것 챙기기에 좋아요." },
        en: { title: "To-dos in notes", body: "Make a note a to-do and tick it off — handy for packing lists and bookings." },
        image: { src: "/updates/2026-11-03-todo-notes.webp", width: 538, height: 512, phone: true }
      },
      {
        ko: { title: "메모 링크 미리보기", body: "메모에 링크를 넣으면 그 페이지의 사진과 제목이 카드로 보여요." },
        en: { title: "Link previews in notes", body: "A link in a note shows its page's picture and title as a card." }
      },
      {
        ko: { title: "사이드바 패널 접기", body: "PC 사이드바의 참여자·날짜·예산·메모 패널을 하나씩 접을 수 있어요." },
        en: { title: "Fold sidebar panels", body: "Each panel in the computer sidebar can be folded away." }
      },
      {
        ko: { title: "테마 색상이 모든 기기에", body: "고른 테마 색상이 계정에 저장돼서 폰과 PC에서 똑같이 보여요." },
        en: { title: "Your colour on every device", body: "The accent colour you choose is saved to your account, so every device matches." }
      }
    ]
  },
  {
    date: "2026-11-01",
    changes: [
      {
        ko: { title: "링크 하나로 초대", body: "공유 링크 하나만 보내면 돼요. 받은 사람은 로그인 전에 시간표를 먼저 둘러보고, 로그인하면 바로 함께 편집해요." },
        en: { title: "One link to invite", body: "Send one link. People can look at the timetable before signing in, then edit together once they do." }
      },
      {
        ko: { title: "소유자 넘기기·참여자 내보내기", body: "참여자 목록에서 다른 사람을 소유자로 바꾸거나 참여자를 내보낼 수 있어요." },
        en: { title: "Hand over or remove members", body: "Make someone else the owner, or remove a member, from the member list." }
      },
      {
        ko: { title: "새로워진 모바일 화면", body: "휴대폰 아래쪽 탭으로 시간표·예산·메모를 오가고, 새로고침도 할 수 있어요." },
        en: { title: "A new phone layout", body: "A bottom tab bar on phones moves between timetable, budget and notes, with refresh." },
        image: { src: "/updates/2026-11-01-phone-layout.webp", width: 780, height: 1688, phone: true }
      }
    ]
  },
  {
    date: "2026-10-30",
    changes: [
      {
        ko: { title: "네이버 로그인", body: "네이버 계정으로 바로 가입하고 로그인할 수 있어요." },
        en: { title: "Sign in with NAVER", body: "Sign up and sign in with a NAVER account." }
      },
      {
        ko: { title: "엑셀에 예산·지출 포함", body: "엑셀로 내보내면 예산과 지출 내역도 함께 들어가요." },
        en: { title: "Budget in Excel exports", body: "Excel exports now include the budget and spending." }
      }
    ]
  },
  {
    date: "2026-10-22",
    changes: [
      {
        ko: { title: "테마 색상 고르기", body: "원하는 색으로 버튼과 강조 색을 바꿀 수 있어요." },
        en: { title: "Pick an accent colour", body: "Choose the colour used for buttons and highlights." }
      },
      {
        ko: { title: "HTML로 내보내기", body: "시간표를 웹 페이지 파일로 저장해 누구에게나 보낼 수 있어요." },
        en: { title: "Export as HTML", body: "Save a timetable as a web page file anyone can open." }
      },
      {
        ko: { title: "커서 옆 실시간 채팅", body: "함께 편집하는 중에 커서 옆에서 바로 짧은 대화를 나눌 수 있어요." },
        en: { title: "Chat by your cursor", body: "Send a quick message right by your cursor while editing together." }
      }
    ]
  }
];

/** "2026년 11월 10일" or "November 10, 2026". */
export function formatReleaseDate(date: string, locale: "ko" | "en") {
  const [y, m, d] = date.split("-").map(Number);
  return locale === "ko"
    ? `${y}년 ${m}월 ${d}일`
    : new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
