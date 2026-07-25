# App Store 관리 스킬

App Store 제출 문서 생성, 메타데이터 업로드, 바이너리 업로드를 자동화합니다.

## Trigger
- `/appstore` 명령어로 실행

## 환경변수 설정 (사전 필수)

API Key 방식을 사용합니다. 환경변수 파일: `.env.testflight.local` (gitignored by `.env.*.local`)

```bash
# 환경변수 로드 (모든 배포 작업 전 필수)
source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')
```

필수 환경변수:
| 변수 | 설명 |
|------|------|
| `APP_STORE_CONNECT_API_KEY_ID` | API Key ID (`<ASC_API_KEY_ID>`) |
| `APP_STORE_CONNECT_API_ISSUER_ID` | Issuer ID |
| `APP_STORE_CONNECT_API_KEY_FILEPATH` | `.p8` 파일 경로 (기본: `~/.private_keys/AuthKey_{KEY_ID}.p8`) |
| `APP_IDENTIFIER` | 앱 번들 ID (`com.solkim.kindergarden`) |

> **중요**: `key_content` (base64) 방식은 OpenSSL 3.6+ 환경에서 `invalid curve name` 에러 발생. 반드시 `key_filepath` 방식 사용.

## 서브커맨드

### `/appstore prepare vX.X.X` — 제출 문서 생성

1. `package.json`에서 현재 버전 확인
2. `git log --oneline` 이전 버전 태그 이후 변경사항 수집
3. `docs/archive/app_store_submissions/` 최신 문서를 템플릿으로 읽기 (없으면 `docs/APP_STORE_METADATA.md` 참고)
4. Claude가 한국어 초안 생성:
   - 버전 헤더, 변경사항 요약 테이블
   - 새로운 기능 (릴리즈 노트)
   - 리뷰어 노트 (새 기능 테스트 방법 포함)
   - 변경 없는 섹션은 "v{이전}와 동일" 표시
   - 상세 코드 변경사항 (커밋 테이블 + 카테고리별 요약)
5. 사용자 검토 후 `docs/archive/app_store_submissions/vX.X.X.md` 저장

### `/appstore metadata [--preview]` — 메타데이터 업로드

**사전 체크리스트:**
- [ ] 환경변수 로드 완료 (`echo $APP_STORE_CONNECT_API_KEY_ID`로 확인)
- [ ] `copyright.txt` 연도가 현재 연도인지 확인
- [ ] `description.txt`에 금지 특수문자 없는지 확인 (아래 문자 제한 참고)
- [ ] `release_notes.txt` 내용이 이번 버전에 맞는지 확인

실행 절차:
1. `docs/archive/app_store_submissions/` 최신 제출 문서 읽기
2. Claude가 각 섹션을 `ios/App/fastlane/metadata/` 파일에 직접 쓰기:
   - "동일" 표시 섹션은 기존 metadata 파일 유지
   - 변경 섹션만 업데이트
3. `--preview` 시: 변경될 파일의 diff 표시 후 종료
4. 기본: 사용자 확인 후 실행:
   ```bash
   cd ios/App && fastlane upload_metadata_with_api_key
   ```
   > name.txt는 Fastfile에서 자동으로 임시 제외 후 복원됩니다.
5. **submit_for_review는 절대 false 유지**

### `/appstore upload` — 바이너리 업로드

**사전 체크리스트:**
- [ ] 환경변수 로드 완료
- [ ] `package.json` 버전 업데이트됨
- [ ] `Info.plist`의 `CFBundleShortVersionString`이 일치함
- [ ] metadata 최신 상태 (필요시 `/appstore metadata` 먼저 실행)

실행 절차:
1. 웹 앱 빌드 및 iOS 동기화:
   ```bash
   pnpm build && npx cap sync ios
   ```
2. TestFlight 배포:
   ```bash
   cd ios/App && fastlane beta_with_api_key
   ```
   또는 스크립트 사용:
   ```bash
   ./scripts/deploy-testflight.sh --api-key
   ```
3. **심사 제출 안 함** — ASC 웹에서 수동 제출

> **주의**: `bundle exec fastlane`은 Bundler 4.0 + fastlane 호환 문제로 실패할 수 있음. 시스템 fastlane 직접 호출(`fastlane` without `bundle exec`) 사용.

## 버전 업데이트 체크리스트

새 버전 배포 시 반드시 아래 항목을 모두 확인:

1. **`package.json`** — `version` 필드 업데이트
2. **`ios/App/App/Info.plist`** — `CFBundleShortVersionString` 확인 (fastlane이 빌드 번호는 자동 처리)
3. **`ios/App/fastlane/metadata/ko/release_notes.txt`** — 릴리스 노트 (새 버전 내용으로)
4. **`ios/App/fastlane/metadata/review_information/notes.txt`** — 리뷰어 노트 업데이트
5. **`docs/APP_STORE_METADATA.md`** — 버전 번호 및 릴리즈 노트 섹션 업데이트
6. **`ios/App/fastlane/metadata/copyright.txt`** — 연도가 현재 연도인지 확인

## 메타데이터 파일 구조

```
ios/App/fastlane/metadata/
├── ko/
│   ├── name.txt              ⚠️ deliver 시 자동 제외됨 (앱 이름 충돌 방지)
│   ├── description.txt
│   ├── keywords.txt
│   ├── release_notes.txt
│   ├── promotional_text.txt
│   ├── support_url.txt
│   └── marketing_url.txt
├── review_information/
│   ├── notes.txt
│   ├── first_name.txt
│   ├── last_name.txt
│   ├── phone_number.txt
│   └── email_address.txt
├── copyright.txt
├── primary_category.txt
└── secondary_category.txt
```

## Apple 메타데이터 문자 제한

- **Box-drawing 문자 금지**: `━`, `┃`, `┏`, `┓` 등 box-drawing 문자는 Apple이 거부함
- **특수 단위 문자 금지**: `㎡` (제곱미터) → `m2`로 대체 필수
- **대시 대체**: 구분선에는 `—` (em dash) 또는 `-` (hyphen) 사용
- **이모지**: 일부 이모지는 허용되지만, 특수 유니코드 문자는 피할 것
- **길이 제한**: release_notes 4000자, description 4000자, keywords 100자, subtitle 30자

## 빌드 프로세스

이 프로젝트는 Next.js + Capacitor 기반이므로, iOS 빌드 전 웹 앱 빌드가 필요:

```bash
# 1. 웹 앱 빌드
pnpm build

# 2. iOS 프로젝트에 동기화
npx cap sync ios

# 3. Fastlane으로 배포 (API Key 방식 — 권장)
source <(grep -v '^#' .env.testflight.local | grep -v '^$' | sed 's/^/export /')
cd ios/App && fastlane beta_with_api_key

# 또는 스크립트로 (환경변수 자동 로드)
./scripts/deploy-testflight.sh --api-key

# 또는 Xcode에서 수동
npx cap open ios
# Product → Archive → Distribute
```

## 안전 규칙

- `submit_for_review`는 절대 `true`로 설정하지 않음
- 메타데이터 업로드 전 반드시 diff 미리보기 제공
- 바이너리 업로드는 production 빌드만
- 심사 제출은 반드시 ASC 웹에서 수동으로
- **`name.txt`는 절대 수정하지 않음** — ASC에서 앱 이름 변경은 심사가 필요하며, 실수로 변경 시 기존 앱 이름이 덮어쓰기됨
- **`name.txt` deliver 자동 제외** — deliver 실행 시 Fastfile이 name.txt를 자동으로 임시 rename 후 복원

## 알려진 이슈

| 이슈 | 원인 | 해결 |
|------|------|------|
| `invalid curve name` 에러 | OpenSSL 3.6 + Ruby 4.0에서 base64 key 디코딩 실패 | `key_filepath` 방식 사용 (Fastfile에 반영됨) |
| `app name already being used` | deliver가 name.txt를 업로드하면 이름 충돌 | Fastfile에서 자동 제외 (임시 rename) |
| `Cannot find edit app store version` 무한 대기 | 새 버전이 ASC에 없을 때 | `app_version` 파라미터에 package.json 버전 전달 (반영됨) |
| `price_tier` 실패 | API Key에 가격 변경 권한 없음 | Deliverfile에서 주석 처리 (ASC에서 이미 설정됨) |
| `precheck IAP` 실패 | API Key로 IAP 조회 불가 | `precheck_include_in_app_purchases: false` 설정 (반영됨) |
| `bundle exec fastlane` 실패 | Bundler 4.0 + fastlane 호환 문제 | 시스템 fastlane 직접 호출 |
| copyright precheck 경고 | 연도가 과거로 설정됨 | `copyright.txt` 연도를 현재 연도로 유지 |

## 참조 파일

- 메타데이터 문서: `docs/APP_STORE_METADATA.md`
- 제출 문서 아카이브: `docs/archive/app_store_submissions/`
- Fastfile: `ios/App/fastlane/Fastfile`
- Appfile: `ios/App/fastlane/Appfile`
- Deliverfile: `ios/App/fastlane/Deliverfile`
- 연령 등급: `ios/App/fastlane/rating_config.json`
- 환경변수: `.env.testflight.local` (gitignored)
- API Key 파일: `~/.private_keys/AuthKey_<ASC_API_KEY_ID>.p8`
