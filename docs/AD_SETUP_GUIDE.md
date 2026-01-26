# 광고 설정 가이드 (KakaoAdFit & Google AdMob)

이 가이드는 `우리동네 유치원` 서비스에 광고를 연동하기 위해 필요한 **KakaoAdFit(웹)**과 **Google AdMob(앱)**의 계정 설정 및 ID 발급 방법을 설명합니다.

---

## 1. KakaoAdFit (웹 광고용)

한국 웹 트래픽에 최적화된 카카오 애드핏을 웹 버전에 적용합니다.

### 1.1 계정 생성 및 매체 등록
1. [KakaoAdFit 홈페이지](https://adfit.kakao.com/) 접속 및 로그인.
2. 상단 메뉴 **[광고관리]** → **[+ 새 매체]** 클릭.
3. **매체명**: `우리동네 유치원 (Web)` 등 식별 가능한 이름 입력.
4. **매체유형**: `Web` 선택.
5. **매체 고유값 (URL)**: 서비스 도메인 입력 (예: `https://where-kindergarden.vercel.app`).
   - *아직 배포 전이라면 임시 도메인이나 GitHub Pages 주소 등을 입력 후 나중에 심사 요청 시 수정할 수 있습니다.*

### 1.2 광고 단위(Ad Unit) 생성
1. 생성된 매체 클릭.
2. **[+ 새 광고단위]** 클릭.
3. **광고단위명**: `모바일 웹 하단 배너` 등 입력.
4. **배너 사이즈**: `320x50` 또는 `320x100` (모바일 웹 표준).
5. **[스크립트/SDK 발급]** 버튼 클릭.

### 1.3 코드 적용
발급받은 스크립트에서 `data-ad-unit` 값을 복사하여 코드에 적용합니다.

**파일**: `src/components/ads/WebAdBanner.tsx`
```typescript
<ins
  className="kakao_ad_area"
  style={{ display: 'none' }}
  data-ad-unit="여기에_발급받은_ID_입력"  // <--- 이 부분을 수정하세요
  data-ad-width="320"
  data-ad-height="50"
/>
```

> **참고**: KakaoAdFit은 매체 심사가 완료되어야 실제 광고가 노출됩니다. 심사 전에는 빈 공간이나 테스트 배너가 보일 수 있습니다.

---

## 2. Google AdMob (앱 광고용)

iOS 및 Android 앱에는 Google AdMob을 사용합니다.

### 2.1 계정 생성 및 앱 추가
1. [Google AdMob 홈페이지](https://admob.google.com/) 접속 및 가입.
2. 사이드바 **[앱]** → **[앱 추가]** 클릭.
3. **플랫폼**: `Android` 선택 (iOS도 동일한 과정으로 별도 생성).
4. **앱 스토어 등록 여부**: 등록 전이라면 `아니요` 선택.
5. **앱 이름**: `우리동네 유치원 (Android)` 입력 후 추가.
6. **동일한 과정으로 iOS용 앱도 추가합니다.** (`우리동네 유치원 (iOS)`)

### 2.2 앱 ID 확인 (App ID)
각 앱(Android/iOS)의 **[앱 설정]** 메뉴에서 **앱 ID**를 확인합니다. (`ca-app-pub-xxxxxxxx~xxxxxxxx` 형식)

**코드 적용 위치**:

- **Android**: `android/app/src/main/AndroidManifest.xml`
  ```xml
  <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-xxxxxxxx~xxxxxxxx"/> <!-- 여기에 Android 앱 ID 입력 -->
  ```

- **iOS**: `ios/App/App/Info.plist`
  ```xml
  <key>GADApplicationIdentifier</key>
  <string>ca-app-pub-xxxxxxxx~xxxxxxxx</string> <!-- 여기에 iOS 앱 ID 입력 -->
  ```

### 2.3 광고 단위 생성 (Ad Unit ID)
1. 각 앱 메뉴에서 **[광고 단위]** → **[광고 단위 추가]** 클릭.
2. **[배너]** 선택.
3. **광고 단위 이름**: `하단 배너` 입력.
4. 생성 후 **광고 단위 ID** 복사 (`ca-app-pub-xxxxxxxx/xxxxxxxx` 형식).
   - *주의: 앱 ID(~ 포함)와 광고 단위 ID(/ 포함)는 다릅니다.*

### 2.4 코드 적용
**파일**: `src/components/ads/MobileAdBanner.tsx`

```typescript
// Android/iOS에 따라 ID를 다르게 설정해야 하거나, 
// 하이브리드 앱에서는 보통 하나의 컴포넌트에서 분기 처리합니다.
// 현재 코드는 테스트 ID가 들어있습니다.

await AdMob.showBanner({
  adId: 'ca-app-pub-xxxxxxxx/xxxxxxxx', // <--- 여기에 실제 배너 광고 단위 ID 입력
  // ...
  isTesting: false, // 배포 시 false로 변경
});
```

> **팁**: 개발 중에는 실수로 인한 정책 위반을 방지하기 위해 `isTesting: true`를 유지하거나, Google에서 제공하는 **테스트 ID**를 사용하는 것이 안전합니다.
> - **Test App ID (Android)**: `ca-app-pub-3940256099942544~3347511713`
> - **Test App ID (iOS)**: `ca-app-pub-3940256099942544~1458002511`

---

## 3. 요약: 수정해야 할 파일

| 항목 | 플랫폼 | 파일 위치 | 입력할 값 |
|------|--------|-----------|-----------|
| **App ID** | Android | `android/.../AndroidManifest.xml` | AdMob 앱 ID (`~`) |
| **App ID** | iOS | `ios/.../Info.plist` | AdMob 앱 ID (`~`) |
| **Ad Unit ID** | 앱 공통 | `src/components/ads/MobileAdBanner.tsx` | AdMob 광고 단위 ID (`/`) |
| **Ad Unit ID** | 웹 | `src/components/ads/WebAdBanner.tsx` | KakaoAdFit ID |

설정이 완료되면 `pnpm dev` (웹) 또는 `pnpm mobile:ios` (앱) 명령어로 테스트해보세요!
