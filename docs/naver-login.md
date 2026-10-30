# 플래너 투게더 네이버 로그인 — Auto-discovery

Supabase의 **Custom OIDC provider**를 사용하며 식별값은 `custom:naver`입니다.
네이버의 서명된 ID 토큰으로 사용자를 식별합니다. 이메일 입력 없이 로그인하고, 동의받은 프로필에서 별명 → 이름 순서로 표시 이름을 저장합니다.
기존 이메일·비밀번호 로그인과 Google 로그인은 계속 사용할 수 있습니다.
Client Secret은 Supabase에만 저장하고 앱 또는 `NEXT_PUBLIC_` 변수에 넣지 않습니다.

## 1. Supabase 자동 설정

[프로젝트 로그인 설정](https://supabase.com/dashboard/project/juuoitgpsuxdwxuvgbfl/auth/providers)에서
**New Provider → Auto-discovery**를 선택합니다.

| 항목 | 입력값 |
| --- | --- |
| Identifier | `custom:naver` (`custom:` 접두사가 화면에 이미 붙어 있으면 `naver`만 입력) |
| Display Name | `NAVER` |
| Configuration Method | `Auto-discovery` |
| Issuer URL | `https://nid.naver.com` |
| Discovery URL | 비워 두기 |
| Client ID | 네이버 앱에서 발급받은 Client ID |
| Client Secret | 네이버 앱에서 발급받은 Client Secret |
| Scopes | `openid, profile` |
| Allow users without email | **켜기** — 이 네이버 제공자에만 적용 |
| PKCE | 켜기 |
| Skip nonce check | 끄기 (항목이 있을 경우) |
| Attribute mapping | 비워 두기 |

네이버 ID 토큰에 이메일이 없으므로 **Allow users without email**이 필요합니다.
이 설정은 이메일·비밀번호 가입의 이메일 확인 설정을 변경하지 않습니다.
Discovery URL은 Issuer 아래의 표준 경로를 자동 사용합니다:
`https://nid.naver.com/.well-known/openid-configuration`.
기존의 수동 Authorization/Token/UserInfo 주소는 입력할 필요가 없습니다.

아직 제공자를 저장하지 않았다면 위 값으로 생성합니다. 수동 OAuth2 제공자를 이미 저장했다면
Supabase는 provider type과 identifier 변경을 허용하지 않으므로, 계정 연결에 영향이 없는지 먼저 확인한 뒤
전환해야 합니다. 기존 제공자나 사용자 계정을 임의로 삭제하지 마세요.

## 2. 네이버 개발자센터

[내 애플리케이션](https://developers.naver.com/apps/#/list)에서 등록한 앱을 선택합니다.

- 이름: `플래너 투게더`
- 사용 API: `네이버 로그인`
- 네이버 로그인 제공 정보에서 **별명과 이름을 선택 항목**으로 설정합니다. 별명을 우선 사용하고, 없으면 이름을 사용합니다. 제공에 동의하지 않아도 로그인은 허용합니다.
- 이메일·전화번호·생일·성별·프로필 사진 등 사용하지 않는 항목은 신청하지 않습니다.
- PC 웹 및 Mobile 웹 서비스 URL: `https://www.planner-together.com/`
- 두 환경의 Callback URL: Supabase 화면의 **Callback URL**을 복사합니다.
  현재 프로젝트는 `https://juuoitgpsuxdwxuvgbfl.supabase.co/auth/v1/callback`입니다.

Supabase에서 **Create and enable provider**로 저장합니다.
Supabase **URL Configuration → Redirect URLs**에는 앱 복귀 주소인
`https://www.planner-together.com/auth/callback`을 허용합니다. 기존 Google 설정은 유지합니다.

## 3. 배포와 테스트

네이버 로그인 버튼은 기본으로 표시됩니다. 별도 Vercel 환경변수로 켤 필요가 없습니다.
이전 안내의 `NEXT_PUBLIC_NAVER_AUTH`는 더 이상 사용하지 않으며, 기존 값은 버튼 표시에 영향을 주지 않습니다.
Supabase의 `custom:naver` 제공자가 활성화되어 있고 **Allow users without email**이 켜져 있어야 합니다.

확인 항목:

1. 앱 관리자 또는 등록된 테스트 계정으로 로그인합니다. 최초 가입은 약관·개인정보 동의를 확인합니다.
2. 이메일 입력 없이 대시보드, 시간표 생성·편집, 초대 참여가 동작하는지 확인합니다.
3. 다시 로그인하면 `public.users.name`과 인증 메타데이터의 `name`에 동의받은 별명을 저장합니다. 별명이 없으면 이름, 둘 다 없으면 기존 표시 이름 또는 `NAVER abc123`을 유지합니다. 이미 가입한 계정도 다음 네이버 로그인에서 갱신됩니다.
   서버 콜백에서 현재 네이버 접근 토큰으로 프로필을 조회하고, 프로필 식별값이 서명 검증된 네이버 계정의 `sub`와 같은지 확인합니다. 선택한 표시 이름 외 프로필 필드와 제공자 토큰은 별도로 저장·출력하지 않습니다.
   프로필 조회 실패·시간 초과·동의 거절은 로그인을 막지 않습니다.
4. 마이페이지가 로딩 상태에 머무르지 않고 네이버 로그인 안내 및 탈퇴 메뉴를 보여 주는지 확인합니다.
5. 탈퇴는 최근 5분 이내 OAuth 인증이 필요합니다. 오래된 세션은 네이버 재인증을 안내합니다.
   인증이 끝나도 자동으로 삭제하지 않으며, 사용자가 다시 탈퇴 확인을 해야 합니다.
6. 이메일 계정 및 Google 계정은 기존 로그인 방법을 유지합니다. 네이버 계정과 기존 계정을 자동으로 합치지 않습니다.
7. 일반 사용자 공개 전 네이버 사전 검수를 신청합니다. 검수 전 테스트 계정 외 로그인이 제한될 수 있습니다.

자동 검사:

```sh
node --experimental-strip-types --test scripts/naver-auth.test.mjs
npm run check
```

실제 네이버 계정 로그인의 최종 확인에는 Supabase 제공자 설정과 테스트 계정이 필요합니다.
자동 검사나 빌드 성공만으로 실제 로그인이 확인되었다고 표시하지 않습니다.

공식 자료:

- [Supabase Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [네이버 OIDC 설정](https://nid.naver.com/.well-known/openid-configuration)
- [네이버 로그인 개발 가이드](https://developers.naver.com/docs/login/devguide/devguide.md)
- [네이버 사전 검수](https://developers.naver.com/docs/login/verify/verify.md)
