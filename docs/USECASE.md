# Use Case Specification

## 우리동네 유치원

**버전**: 1.0.0
**작성일**: 2026-01-21
**표준**: Cockburn Use Case Template + UML 2.5

---

## 1. Use Case Overview

### 1.1 Actor Catalog

| Actor | Type | Description | Goals |
|-------|------|-------------|-------|
| **부모** | Primary | 유치원/어린이집을 찾는 사용자 | 자녀에게 최적의 기관 선택 |
| **공유 수신자** | Secondary | 공유된 비교표를 확인하는 사용자 | 비교 결과 검토 |
| **유치원 알리미 API** | External System | 기관 데이터 제공 | - |
| **Kakao API** | External System | 지도/지오코딩 제공 | - |
| **Geolocation API** | External System | GPS 좌표 제공 | - |

### 1.2 Use Case Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           우리동네 유치원                                    │
│                                                                             │
│    ┌─────────────────────────────────────────────────────────────────┐     │
│    │                                                                 │     │
│    │                          <<include>>                            │     │
│    │              ┌───────────────────────────────┐                  │     │
│    │              │                               ▼                  │     │
│    │         ┌────────┐                     ┌──────────┐            │     │
│    │         │UC-01   │                     │ UC-02    │            │     │
│ ┌──┴──┐      │GPS 위치│                     │ 주소     │            │     │
│ │     │─────▶│ 검색   │                     │ 검색     │            │     │
│ │부모 │      └────┬───┘                     └──────────┘            │     │
│ │     │           │                                                  │     │
│ └──┬──┘           │ <<include>>                                      │     │
│    │              ▼                                                  │     │
│    │         ┌────────┐        ┌──────────┐        ┌──────────┐     │     │
│    │         │UC-03   │        │ UC-04    │        │ UC-05    │     │     │
│    ├────────▶│검색결과│───────▶│ 상세정보 │───────▶│ 비교선택 │     │     │
│    │         │ 조회   │        │ 확인     │        │          │     │     │
│    │         └────────┘        └──────────┘        └────┬─────┘     │     │
│    │                                                     │          │     │
│    │                                                     ▼          │     │
│    │                                               ┌──────────┐     │     │
│    │                                               │ UC-06    │     │     │
│    ├──────────────────────────────────────────────▶│ 비교표   │     │     │
│    │                                               │ 생성     │     │     │
│    │                                               └────┬─────┘     │     │
│    │                                                    │           │     │
│    │         <<extend>>           <<extend>>            ▼           │     │
│    │        ┌──────────┐        ┌──────────┐     ┌──────────┐      │     │
│    │        │ UC-07    │        │ UC-08    │     │ UC-09    │      │     │
│    └───────▶│ 지도뷰   │        │ 반경변경 │     │ 공유     │◀─────┼─────┤
│             │ 확인     │        │          │     │          │      │     │
│             └──────────┘        └──────────┘     └──────────┘      │     │
│                                                                     │     │
│    └─────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                    │                               │
                    ▼                               ▼
            ┌──────────────┐                ┌─────────────┐
            │ Geolocation  │                │ 공유        │
            │ API          │                │ 수신자      │
            └──────────────┘                └─────────────┘
```

### 1.3 Use Case List

| ID | Name | Priority | Complexity | Status |
|----|------|----------|------------|--------|
| UC-01 | GPS 위치 검색 | P0 | Medium | Implemented |
| UC-02 | 주소 검색 | P0 | Medium | Implemented |
| UC-03 | 검색 결과 조회 | P0 | High | Implemented |
| UC-04 | 상세 정보 확인 | P0 | Low | Implemented |
| UC-05 | 비교 선택 | P0 | Low | Implemented |
| UC-06 | 비교표 생성 | P0 | Medium | Implemented |
| UC-07 | 지도 뷰 확인 | P1 | Medium | Implemented |
| UC-08 | 반경 변경 | P0 | Low | Implemented |
| UC-09 | 공유 | P0 | Low | Partial (카카오톡 SDK 미연동) |

---

## 2. Use Case Specifications

### UC-01: GPS 위치 검색

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-01 |
| **Use Case Name** | GPS 위치 검색 |
| **Version** | 1.0 |
| **Created** | 2026-01-21 |
| **Primary Actor** | 부모 |
| **Secondary Actors** | Geolocation API |
| **Description** | 사용자의 현재 GPS 위치를 기반으로 주변 유치원을 검색한다 |
| **Trigger** | 사용자가 "현재 위치로 검색하기" 버튼을 클릭 |
| **Pre-conditions** | 1. 사용자가 홈페이지(/)에 접속해 있음<br>2. 디바이스가 GPS를 지원함 |
| **Post-conditions** | 1. 사용자 위치 기반 검색 결과가 표시됨<br>2. URL에 좌표가 반영됨 |

#### Main Success Scenario (Basic Flow)

| Step | Actor | System |
|------|-------|--------|
| 1 | "현재 위치로 검색하기" 버튼 클릭 | - |
| 2 | - | 브라우저 위치 권한 요청 다이얼로그 표시 |
| 3 | "허용" 선택 | - |
| 4 | - | GPS 좌표 획득 (lat, lng) |
| 5 | - | 좌표를 시군구 코드로 변환 |
| 6 | - | /search?lat={lat}&lng={lng}&radius=1 로 이동 |
| 7 | - | 검색 결과 표시 (UC-03으로 연결) |

#### Extensions (Alternative Flows)

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **3a** | 사용자가 "거부" 선택 | 3a1. "위치 권한이 필요합니다" 메시지 표시<br>3a2. 주소 검색 UI 강조 표시<br>3a3. UC-02로 대체 |
| **4a** | GPS 타임아웃 (10초 초과) | 4a1. "위치를 확인할 수 없습니다" 토스트 표시<br>4a2. 주소 검색 UI 강조 표시<br>4a3. UC-02로 대체 |
| **4b** | GPS 정확도 낮음 (500m 초과) | 4b1. 경고 메시지 표시: "위치 정확도가 낮습니다"<br>4b2. 검색은 계속 진행 |

#### Business Rules

| Rule ID | Description |
|---------|-------------|
| BR-01 | GPS 좌표는 서버에 저장하지 않음 |
| BR-02 | 위치 권한 거부 시 세션 내에서 재요청하지 않음 |
| BR-03 | 기본 반경은 1km로 설정 |

#### UI Mockup Reference

```
┌─────────────────────────────────────┐
│                                     │
│         🏫 우리동네 유치원           │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 📍 현재 위치로 검색하기 ←───┼───── [Primary CTA]
│  └─────────────────────────────┘   │
│                                     │
│           ─── 또는 ───              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ 🔍 주소로 검색하기          │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

### UC-02: 주소 검색

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-02 |
| **Use Case Name** | 주소 검색 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Secondary Actors** | Kakao 주소 검색 API |
| **Description** | 주소 입력을 통해 해당 위치 주변 유치원을 검색한다 |
| **Trigger** | 1. GPS 권한 거부 후 주소 검색 선택<br>2. "주소로 검색하기" 버튼 클릭 |
| **Pre-conditions** | 사용자가 홈페이지(/) 또는 검색 결과 페이지에 있음 |
| **Post-conditions** | 입력된 주소 기반 검색 결과가 표시됨 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | "주소로 검색하기" 클릭 | - |
| 2 | - | 주소 검색 모달/입력창 표시 |
| 3 | 주소 입력 시작 (예: "강남구 역삼동") | - |
| 4 | - | Kakao API로 자동완성 결과 조회 |
| 5 | - | 자동완성 목록 표시 |
| 6 | 원하는 주소 선택 | - |
| 7 | - | 선택된 주소의 좌표 획득 |
| 8 | - | /search?lat={lat}&lng={lng}&radius=1 로 이동 |

#### Extensions

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **4a** | 자동완성 결과 없음 | 4a1. "검색 결과가 없습니다" 표시<br>4a2. 더 구체적인 주소 입력 유도 |
| **5a** | Kakao API 오류 | 5a1. "주소 검색 서비스에 일시적인 오류" 토스트<br>5a2. 3초 후 자동 재시도 |

#### Business Rules

| Rule ID | Description |
|---------|-------------|
| BR-04 | 최소 2자 이상 입력 시 자동완성 시작 |
| BR-05 | 자동완성 결과는 최대 10개까지 표시 |
| BR-06 | 최근 검색 주소는 로컬 스토리지에 저장 (Phase 2) |

---

### UC-03: 검색 결과 조회

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-03 |
| **Use Case Name** | 검색 결과 조회 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Secondary Actors** | 유치원 알리미 API |
| **Description** | 위치 기반으로 주변 유치원/어린이집 목록을 조회한다 |
| **Trigger** | /search 페이지 진입 (UC-01 또는 UC-02 완료 후) |
| **Pre-conditions** | URL에 유효한 lat, lng 파라미터가 존재함 |
| **Post-conditions** | 반경 내 기관 목록이 거리순으로 표시됨 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | - | URL에서 lat, lng, radius 파라미터 추출 |
| 2 | - | 좌표 기반 시군구 코드 산출 |
| 3 | - | 로딩 Skeleton UI 표시 |
| 4 | - | 유치원 알리미 API 호출 (병렬: 기본정보, 통학, 급식, 면적, 방과후) |
| 5 | - | 응답 데이터 정규화 및 병합 |
| 6 | - | Haversine 공식으로 거리 계산 |
| 7 | - | 반경 내 기관만 필터링 |
| 8 | - | 거리순 정렬 |
| 9 | - | 결과 목록 표시 (초기 20개) |
| 10 | 스크롤 다운 | - |
| 11 | - | 추가 20개 Load More |

#### Extensions

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **4a** | API 일부 실패 | 4a1. 성공한 데이터만 사용<br>4a2. 실패 항목은 "N/A" 표시 |
| **4b** | API 전체 실패 | 4b1. 에러 화면 표시<br>4b2. "다시 시도" 버튼 제공 |
| **7a** | 반경 내 결과 0개 | 7a1. "주변에 기관이 없습니다" 표시<br>7a2. 반경 확대 버튼 제공 (2km, 5km) |
| **9a** | 결과가 100개 초과 | 9a1. 상위 100개만 표시<br>9a2. "반경을 줄여보세요" 안내 |

#### Business Rules

| Rule ID | Description |
|---------|-------------|
| BR-07 | API 응답은 24시간 캐싱 |
| BR-08 | 인접 시군구도 함께 조회하여 경계 지역 대응 |
| BR-09 | 거리 계산은 클라이언트 사이드에서 수행 |
| BR-10 | 목록 표시 정보: 기관명, 유형, 거리, 정원, 통학차량 유무 (현원은 API 미제공) |

#### Data Flow

```
┌────────────────────────────────────────────────────────────────────┐
│                       UC-03 Data Flow                              │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  [URL Params]                                                      │
│       │                                                            │
│       ▼                                                            │
│  lat: 37.5012                                                      │
│  lng: 127.0396                                                     │
│  radius: 1                                                         │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────────────────┐                                         │
│  │ 시군구 코드 변환      │ → "11680" (강남구)                       │
│  └──────────────────────┘                                         │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────────────────┐     ┌──────────────────────┐           │
│  │ 유치원 알리미 API    │────▶│  5개 엔드포인트 병렬   │           │
│  │ /api/kindergartens   │     │  - basicInfo         │           │
│  └──────────────────────┘     │  - schoolBus         │           │
│       │                       │  - schoolMeal        │           │
│       │                       │  - classArea         │           │
│       │                       │  - afterSchoolPresent│           │
│       │                       └──────────────────────┘           │
│       ▼                                                            │
│  ┌──────────────────────┐                                         │
│  │ 데이터 정규화        │ → Kindergarten[] 타입으로 변환           │
│  │ (Transformer)        │                                         │
│  └──────────────────────┘                                         │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────────────────┐                                         │
│  │ Haversine 거리 계산  │ → 각 기관에 distance 필드 추가           │
│  └──────────────────────┘                                         │
│       │                                                            │
│       ▼                                                            │
│  ┌──────────────────────┐                                         │
│  │ 반경 필터 + 정렬     │ → 1km 이내, 거리 오름차순               │
│  └──────────────────────┘                                         │
│       │                                                            │
│       ▼                                                            │
│  [검색 결과 목록 렌더링]                                            │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

### UC-04: 상세 정보 확인

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-04 |
| **Use Case Name** | 상세 정보 확인 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Description** | 목록에서 특정 기관의 상세 정보를 인라인으로 확인한다 |
| **Trigger** | 검색 결과 목록에서 기관 카드 클릭 |
| **Pre-conditions** | 검색 결과가 표시되어 있음 |
| **Post-conditions** | 선택한 기관의 상세 정보가 확장 표시됨 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | 기관 카드 클릭 | - |
| 2 | - | 해당 위치에서 상세 정보 영역 확장 (애니메이션) |
| 3 | - | 추가 정보 표시: 주소, 전화번호, 급식, 1인당 면적, 방과후 |
| 4 | "접기" 버튼 클릭 또는 다시 클릭 | - |
| 5 | - | 상세 정보 영역 축소 |

#### Extensions

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **2a** | 이미 다른 카드가 확장된 상태 | 2a1. 기존 확장 카드 축소<br>2a2. 새로운 카드 확장 |

#### UI State Diagram

```
┌─────────────────┐                     ┌─────────────────┐
│                 │                     │                 │
│    Collapsed    │────── Click ───────▶│    Expanded     │
│    (기본 정보)   │                     │  (상세 정보)    │
│                 │◀───── Click ────────│                 │
│                 │                     │                 │
└─────────────────┘                     └─────────────────┘
```

---

### UC-05: 비교 선택

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-05 |
| **Use Case Name** | 비교 선택 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Description** | 비교할 기관을 체크박스로 선택한다 (최대 3개) |
| **Trigger** | 검색 결과에서 기관의 체크박스 클릭 |
| **Pre-conditions** | 검색 결과가 표시되어 있음 |
| **Post-conditions** | 1. 선택된 기관이 비교 스토어에 추가됨<br>2. 플로팅 바에 선택 현황 표시 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | 첫 번째 기관 체크박스 선택 | - |
| 2 | - | 비교 스토어에 기관 추가 |
| 3 | - | 하단 플로팅 바 표시: "1개 선택됨" |
| 4 | 두 번째 기관 선택 | - |
| 5 | - | 플로팅 바 업데이트: "2개 선택됨" |
| 6 | 세 번째 기관 선택 | - |
| 7 | - | 플로팅 바 업데이트: "3개 선택됨 [비교하기]" |

#### Extensions

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **1a** | 이미 3개 선택된 상태에서 추가 선택 | 1a1. "최대 3개까지 비교할 수 있습니다" 토스트 표시<br>1a2. 체크박스 선택 취소 |
| **7a** | 선택된 기관 체크 해제 | 7a1. 비교 스토어에서 제거<br>7a2. 플로팅 바 카운트 업데이트 |

#### Business Rules

| Rule ID | Description |
|---------|-------------|
| BR-11 | 최대 3개 기관 동시 선택 가능 |
| BR-12 | 최소 1개 이상 선택 시 플로팅 바 표시 |
| BR-13 | 선택 상태는 Zustand 스토어로 관리 (URL에는 미반영) |

---

### UC-06: 비교표 생성

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-06 |
| **Use Case Name** | 비교표 생성 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Description** | 선택한 기관들의 비교표를 생성하여 표시한다 |
| **Trigger** | 플로팅 바의 "비교하기" 버튼 클릭 |
| **Pre-conditions** | 1개 이상의 기관이 선택되어 있음 |
| **Post-conditions** | /compare 페이지에 비교표가 표시됨 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | "비교하기" 버튼 클릭 | - |
| 2 | - | /compare 페이지로 이동 |
| 3 | - | 선택된 기관 데이터로 비교표 렌더링 |
| 4 | - | 각 항목에서 최적값 강조 표시 |
| 5 | 아코디언 섹션 토글 | - |
| 6 | - | 해당 섹션 확장/축소 |

#### Extensions

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **2a** | 선택된 기관이 0개 | 2a1. 빈 상태 UI 표시<br>2a2. "기관 검색하기" 버튼 제공 |

#### Comparison Sections

| Section | Items | Highlight Criteria |
|---------|-------|-------------------|
| 기본 정보 | 기관명, 설립유형, 거리 | 거리 최소값 |
| 정원 | 정원 (현원은 API 미제공으로 표시 불가) | - |
| 통학/급식 | 통학차량 유무/대수, 급식 방식 | - |
| 시설/면적 | 1인당 면적, 놀이터 유무 | 면적 최대값 |
| 방과후 | 운영 여부, 시간 | - |

#### UI Mockup Reference

```
┌─────────────────────────────────────────────────────────────┐
│  ← 비교 결과 (3개 기관)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [▼ 기본 정보]                                              │
│  ┌─────────┬────────────┬────────────┬────────────┐        │
│  │         │ 역삼유치원  │ 해맑은     │ 꿈나무     │        │
│  ├─────────┼────────────┼────────────┼────────────┤        │
│  │ 유형    │ 공립       │ 민간       │ 사립       │        │
│  │ 거리    │ 🟢 0.3km  │ 0.5km      │ 0.8km      │        │
│  └─────────┴────────────┴────────────┴────────────┘        │
│                                                             │
│  [▶ 정원/현원]                                              │
│                                                             │
│  [▶ 통학/급식]                                              │
│                                                             │
│  [▶ 시설/면적]                                              │
│                                                             │
│  [▶ 방과후]                                                 │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [📤 카카오톡 공유]         [🔗 링크 복사]                   │
└─────────────────────────────────────────────────────────────┘
```

---

### UC-07: 지도 뷰 확인

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-07 |
| **Use Case Name** | 지도 뷰 확인 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Secondary Actors** | Kakao Maps API |
| **Description** | 검색 결과를 지도에서 시각적으로 확인한다 |
| **Trigger** | 검색 결과 페이지에서 "지도" 뷰 탭 선택 |
| **Pre-conditions** | 검색 결과가 존재함 |
| **Post-conditions** | 지도에 기관 마커가 표시됨 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | "지도" 뷰 탭 클릭 | - |
| 2 | - | Kakao Maps 초기화 (사용자 위치 중심) |
| 3 | - | 검색 결과 기관들의 마커 표시 |
| 4 | 마커 클릭 | - |
| 5 | - | 인포 윈도우 표시 (기관명, 거리, 유형) |
| 6 | 인포 윈도우 내 체크박스 선택 | - |
| 7 | - | 비교 스토어에 기관 추가 (UC-05와 동일) |

#### Extensions

| Extension | Condition | Steps |
|-----------|-----------|-------|
| **2a** | Kakao Maps API 로딩 실패 | 2a1. "지도를 불러올 수 없습니다" 에러 표시<br>2a2. 목록 뷰로 자동 전환 |

---

### UC-08: 반경 변경

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-08 |
| **Use Case Name** | 반경 변경 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Description** | 검색 반경을 변경하여 결과를 다시 필터링한다 |
| **Trigger** | 반경 드롭다운/버튼 선택 |
| **Pre-conditions** | 검색 결과 페이지에 있음 |
| **Post-conditions** | URL과 결과 목록이 새 반경으로 업데이트됨 |

#### Main Success Scenario

| Step | Actor | System |
|------|-------|--------|
| 1 | 반경 드롭다운 클릭 | - |
| 2 | - | 옵션 표시: 1km, 2km, 5km |
| 3 | 새 반경 선택 (예: 2km) | - |
| 4 | - | URL 파라미터 업데이트 (?radius=2) |
| 5 | - | 기존 데이터에서 새 반경으로 재필터링 |
| 6 | - | 결과 목록 업데이트 |

#### Business Rules

| Rule ID | Description |
|---------|-------------|
| BR-14 | 반경 변경 시 API 재호출 없음 (클라이언트 필터링) |
| BR-15 | 반경 변경 후 기존 비교 선택 유지 |

---

### UC-09: 공유

#### Basic Information

| Item | Description |
|------|-------------|
| **Use Case ID** | UC-09 |
| **Use Case Name** | 공유 |
| **Version** | 1.0 |
| **Primary Actor** | 부모 |
| **Secondary Actors** | 공유 수신자 |
| **Description** | 비교표를 카카오톡 또는 링크로 공유한다 |
| **Trigger** | 비교표 페이지에서 공유 버튼 클릭 |
| **Pre-conditions** | 비교표가 생성되어 있음 |
| **Post-conditions** | 공유 가능한 URL이 생성/전송됨 |

#### Main Success Scenario (카카오톡)

| Step | Actor | System |
|------|-------|--------|
| 1 | "카카오톡 공유" 버튼 클릭 | - |
| 2 | - | Kakao SDK shareCustom 호출 |
| 3 | - | 카카오톡 앱 열림 (또는 웹 공유 화면) |
| 4 | 대화 상대 선택 | - |
| 5 | - | 공유 메시지 전송 |

#### Main Success Scenario (링크 복사)

| Step | Actor | System |
|------|-------|--------|
| 1 | "링크 복사" 버튼 클릭 | - |
| 2 | - | 현재 URL을 클립보드에 복사 |
| 3 | - | "링크가 복사되었습니다" 토스트 표시 |

#### Shared Data Structure

```typescript
// 카카오톡 공유 데이터
{
  title: "우리동네 유치원 비교",
  description: "역삼유치원 외 2곳 비교 결과",
  imageUrl: "/og-image.png",  // 정적 대표 이미지
  link: {
    mobileWebUrl: "https://xxx.vercel.app/compare?ids=K001,K002,K003",
    webUrl: "https://xxx.vercel.app/compare?ids=K001,K002,K003"
  }
}
```

---

## 3. Non-Functional Requirements Use Cases

### UC-NFR-01: 성능

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| 초기 페이지 로드 | 홈페이지 접속 | LCP < 2.5초 |
| 검색 API 호출 | GPS 검색 실행 | 응답 시간 < 3초 |
| 비교표 렌더링 | 3개 기관 비교 | TTI < 1초 |
| 스크롤 성능 | 100개 결과 스크롤 | 60fps 유지 |

### UC-NFR-02: 접근성

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| 키보드 네비게이션 | Tab 키로 이동 | 모든 인터랙티브 요소 접근 가능 |
| 스크린 리더 | VoiceOver 사용 | 모든 콘텐츠 읽기 가능 |
| 터치 영역 | 버튼 터치 | 최소 48x48px 영역 |

### UC-NFR-03: 에러 복구

| Scenario | Steps | Expected Result |
|----------|-------|-----------------|
| 네트워크 오류 | API 호출 중 연결 끊김 | "다시 시도" 버튼 표시 |
| GPS 타임아웃 | 10초 이상 응답 없음 | 주소 검색으로 대체 |
| API 부분 실패 | 5개 중 2개 API 실패 | 성공 데이터만 표시, 실패 항목 N/A |

---

## 4. Traceability Matrix

### Requirements ↔ Use Cases

| Requirement | Use Cases | Status |
|-------------|-----------|--------|
| REQ-01: GPS 검색 | UC-01 | ✅ |
| REQ-02: 주소 검색 | UC-02 | ✅ |
| REQ-03: 반경 필터 | UC-08 | ✅ |
| REQ-04: 목록 뷰 | UC-03 | ✅ |
| REQ-05: 지도 뷰 | UC-07 | ✅ |
| REQ-06: 상세 정보 | UC-04 | ✅ |
| REQ-07: 비교 선택 | UC-05 | ✅ |
| REQ-08: 비교표 | UC-06 | ✅ |
| REQ-09: 공유 | UC-09 | 🔄 (링크 복사만 구현, 카카오톡 미연동) |

### Use Cases ↔ Components

| Use Case | Implementing Components |
|----------|------------------------|
| UC-01 | `useGeolocation.ts`, `Hero.tsx` |
| UC-02 | `useAddressSearch.ts`, `SearchHeader.tsx` |
| UC-03 | `KindergartenList.tsx`, `searchStore.ts`, `kindergartenApi.ts` |
| UC-04 | `KindergartenList.tsx` (expand) |
| UC-05 | `CompareFloatingBar.tsx`, `compareStore.ts` |
| UC-06 | `ComparePage.tsx`, `CompareGrid.tsx` |
| UC-07 | `MapView.tsx`, `useKakaoMap.ts` |
| UC-08 | `SearchHeader.tsx`, `useURLSync.ts` |
| UC-09 | (Partial) - `CompareHeader.tsx` (링크 복사만 구현, 카카오톡 SDK 미연동) |

---

## 5. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-21 | Claude | Initial creation |
