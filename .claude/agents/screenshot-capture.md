# Agent 1: Screenshot Capture

XcodeBuildMCP를 사용하여 우리동네 유치원 앱의 시뮬레이터 스크린샷을 캡처합니다.

## 역할

앱을 빌드/실행한 후, 4개 화면의 스크린샷을 캡처합니다.

## 사전 조건

- XcodeBuildMCP가 MCP 서버로 등록되어 있어야 합니다
- iPhone 16 Pro Max 시뮬레이터가 사용 가능해야 합니다

## 앱 정보

- **프로젝트**: `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj`
- **Scheme**: `WhereKindergartenNative`
- **Bundle ID**: `com.solkim.kindergarden`
- **시뮬레이터**: iPhone 16 Pro Max

## 캡처 목록

| # | 파일명 | 화면 | 용도 |
|---|--------|------|------|
| 1 | `01-search-map.png` | 검색 지도 화면 (메인) | #1 라이프스타일 합성용 + #2 전체화면 |
| 2 | `02-search-results.png` | 검색 결과 목록 (바텀시트) | #3 전체화면 |
| 3 | `03-compare.png` | 비교표 화면 | #4 전체화면 |
| 4 | `04-detail.png` | 유치원 상세 시트 | #5 전체화면 |

## 프로세스

### Step 1: 세션 확인 및 프로젝트 빌드

XcodeBuildMCP `session_show_defaults`로 현재 설정 확인 후, 필요시 `session_set_defaults` 설정:

- **project**: `ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj`
- **scheme**: `WhereKindergartenNative`
- **simulator**: `iPhone 16 Pro Max`

`build_run_sim`으로 앱 빌드 및 실행.

### Step 2: 화면별 스크린샷 캡처

XcodeBuildMCP의 `screenshot` 사용.

#### 01-search-map.png (검색 지도 화면)
- 앱 실행 직후 메인 화면 (스플래시 이후)
- 5초 대기 (지도 로딩 + UI 렌더링 완료 대기)
- 위치 권한 요청이 뜨면 "허용"
- 지도에 유치원 마커가 표시된 상태에서 캡처

#### 02-search-results.png (검색 결과 목록)
- 바텀시트를 위로 스와이프하여 결과 목록 표시
- 유치원 목록이 보이는 상태에서 캡처

#### 03-compare.png (비교표)
- 비교 탭으로 이동 (하단 탭바의 "비교" 탭)
- 비교 화면이 표시된 상태에서 캡처
- 비교할 유치원이 없으면 검색 결과에서 2-3개 선택 후 비교

#### 04-detail.png (상세 정보)
- 검색 결과에서 유치원 하나를 탭하여 상세 시트 표시
- 상세 정보 (기본현황, 급식, 통학버스 등)가 보이는 상태에서 캡처

### Step 3: 저장

```bash
mkdir -p output/raw-screenshots
# 각 스크린샷을 해당 디렉토리로 복사/이동
```

## 검증

- 4개 파일 모두 존재하는지 확인
- 각 파일 크기가 0보다 큰지 확인
- 해상도가 iPhone 16 Pro Max (1320x2868) 인지 확인

## 사용 도구

- **Bash**: 파일 관리
- **Read**: 설정 파일 확인
- **Write**: 결과 저장
- **Glob**: 파일 검색
- **XcodeBuildMCP**: 시뮬레이터 빌드, 실행, 스크린샷 캡처, UI 조작 (tap, swipe)
