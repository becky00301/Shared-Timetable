# 플래너 투게더 네이버 로그인 — Auto-discovery

Supabase의 **Custom OIDC provider**를 사용하며 식별값은 `custom:naver`입니다.
네이버의 서명된 ID 토큰으로 사용자를 식별합니다. 이메일 입력·프로필 조회 없이 로그인합니다.
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
| Scopes | `openid` |
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
- 이메일·이름·전화번호·생일·성별·프로필 사진은 신청하지 않습니다. 이미 선택했다면 이 구현에 필요 없는 제공 정보는 해제합니다.
- PC 웹 및 Mobile 웹 서비스 URL: `https://www.planner-together.com/`
- 두 환경의 Callback URL: Supabase 화면의 **Callback URL**을 복사합니다.
  현재 프로젝트는 `https://juuoitgpsuxdwxuvgbfl.supabase.co/auth/v1/callback`입니다.

Supabase에서 **Create and enable provider**로 저장합니다.
Supabase **URL Configuration → Redirect URLs**에는 앱 복귀 주소인
`https://www.planner-together.com/auth/callback`을 허용합니다. 기존 Google 설정은 유지합니다.

## 3. 버튼 활성화와 테스트

Vercel의 실제 도메인을 서비스하는 프로젝트 → **Environment Variables**:

- Key: `NEXT_PUBLIC_NAVER_AUTH`
- Value: `1`
- Type: `Config`
- 테스트에는 Preview, 운영 공개에는 Production을 선택한 뒤 재배포합니다.

확인 항목:

1. 앱 관리자 또는 등록된 테스트 계정으로 로그인합니다. 최초 가입은 약관·개인정보 동의를 확인합니다.
2. 이메일 입력 없이 대시보드, 시간표 생성·편집, 초대 참여가 동작하는지 확인합니다.
3. 표시 이름은 `NAVER abc123` 형식입니다. 비회원 체험 계정과 구분합니다.
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
