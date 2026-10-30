# 플래너 투게더 네이버 로그인 설정

현재 구현은 Supabase **Custom OAuth2 provider**의 식별값 `custom:naver`를 사용합니다.
네이버의 중첩된 프로필 응답을 `/api/auth/naver/userinfo`가 Supabase 형식으로 변환합니다.
Client Secret은 Supabase에만 저장하며, 앱이나 `NEXT_PUBLIC_` 환경변수에 넣지 않습니다.

## 1. 네이버 개발자센터

[내 애플리케이션](https://developers.naver.com/apps/#/list)에서 등록한 애플리케이션을 선택합니다.

- 애플리케이션 이름: `플래너 투게더`
- 사용 API: `네이버 로그인`
- 제공 정보: `이메일 주소`만 필수로 신청합니다. 이름·전화번호·생일·성별·프로필 사진은 이 구현에서 사용하지 않습니다.
- 로그인 환경: `PC 웹`
- 서비스 URL: `https://www.planner-together.com`
- Callback URL: **다음 단계 Supabase 생성 화면에 표시되는 Callback URL을 그대로 복사합니다.** 프로젝트 기본 주소는 `https://juuoitgpsuxdwxuvgbfl.supabase.co/auth/v1/callback`이며, Supabase 화면에 다른 주소가 표시되면 화면의 주소를 우선합니다. 웹사이트의 `/auth/callback`과 혼동하지 마세요.

Client ID와 Client Secret은 다음 단계의 같은 이름 입력란에 사용합니다.

## 2. Supabase

[프로젝트 Authentication](https://supabase.com/dashboard/project/juuoitgpsuxdwxuvgbfl/auth/providers)에서
**Sign In / Providers → New Provider → Manual configuration (OAuth2)**를 선택합니다.

| 항목 | 입력값 |
| --- | --- |
| Identifier | `custom:naver` |
| Name | `NAVER` |
| Client ID | 등록한 네이버 앱의 Client ID |
| Client Secret | 등록한 네이버 앱의 Client Secret |
| Authorization URL | `https://nid.naver.com/oauth2/authorize` |
| Token URL | `https://nid.naver.com/oauth2/token` |
| UserInfo URL | `https://www.planner-together.com/api/auth/naver/userinfo` |
| Scopes | `openid`와 `profile` (두 항목) |
| PKCE | 켜기 |
| Email optional / Allow users without an email | 끄기 |
| Attribute mapping | 비워 두기 |

OIDC 자동 검색 대신 OAuth2 수동 설정을 사용합니다. 네이버 ID 토큰에는 이메일이 없으며,
공식 프로필 API는 `response` 안에 이메일과 식별값을 반환하기 때문에 변환 경로가 필요합니다.
네이버의 새 `/oauth2/` 엔드포인트는 PKCE를 지원합니다. 기존 `/oauth2.0/` 주소와 섞지 마세요.

생성 화면에 표시된 Callback URL을 네이버에 등록한 후 **Create and enable provider**로 저장합니다.
Auth **URL Configuration → Redirect URLs**에는 로그인 완료 후 돌아올 앱 주소
`https://www.planner-together.com/auth/callback`도 허용되어 있어야 합니다. 기존 Google 로그인 설정이 있으면 유지합니다.

### 이메일 확인과 기존 계정

네이버의 연락처 이메일을 검증된 이메일이라고 가정하지 않습니다. 변환 응답은 항상
`email_verified: false`입니다. Supabase 이메일 확인 설정에 따라 인증 메일을 먼저 확인해야 할 수 있으며,
로그인 화면은 해당 오류가 반환되면 안내를 표시합니다. 메일 발송 및 인증 후 재로그인도 테스트합니다.
이를 우회하려고 `email_verified: true`를 고정하거나 전체 프로젝트 이메일 보안을 낮추지 마세요.

같은 이메일이라는 이유만으로 기존 계정의 시간표가 반드시 연결되는 것은 아닙니다.
공개 전에 기존 이메일/Google 계정과의 동작을 확인하고, 별도 계정이 생성되면 임의로 데이터나 계정을 합치지 않습니다.

## 3. 코드 배포 후 테스트

1. 먼저 이 코드와 `/api/auth/naver/userinfo`를 배포합니다. 버튼은 아직 숨겨 둡니다.
2. Vercel에서 실제 도메인을 서비스하는 프로젝트의 **Environment Variables**에
   `NEXT_PUBLIC_NAVER_AUTH`를 **Config**, 값 `1`로 추가합니다.
   Production과 테스트에 필요한 Preview를 선택하고 다시 배포합니다.
   이 값은 버튼 표시 스위치이며 비밀키가 아닙니다.
3. 네이버 앱 관리자 또는 등록된 테스트 계정으로 로그인·회원가입을 확인합니다.
   회원가입 화면에서 약관 및 개인정보 동의 없이는 외부 로그인으로 이동하지 않아야 합니다.
4. 초대 링크와 시간표에서 로그인 후 원래 목적지로 돌아오는지, 기존 Google/이메일 로그인이 유지되는지 확인합니다.
5. 네이버 **네이버 로그인 검수 상태**에서 사전 검수를 신청합니다.
   로그인 버튼, 정보 제공 동의, 서비스 이용 흐름을 보여 주는 자료를 제출합니다.
   검수 전에는 일반 이용자의 로그인이 제한될 수 있습니다. 검수 중 공개를 원하지 않으면
   Production의 스위치는 비우고 Preview에만 `1`을 설정해 테스트합니다.

기술 검증:

```sh
node --experimental-strip-types --test scripts/naver-auth.test.mjs
npm run check
```

전체 네이버 로그인 성공 여부는 실제 앱 자격증명과 테스트 계정으로 확인해야 합니다.

공식 자료:

- [Supabase Custom OAuth/OIDC Providers](https://supabase.com/docs/guides/auth/custom-oauth-providers)
- [네이버 로그인 개발 가이드](https://developers.naver.com/docs/login/devguide/devguide.md)
- [네이버 로그인 버튼 사용 가이드](https://developers.naver.com/docs/login/bi/bi.md)
- [네이버 로그인 사전 검수](https://developers.naver.com/docs/login/verify/verify.md)
