# NativeApp

SwiftUI-first native package for `우리동네 유치원`.

## Source of truth
- Native source of truth: `ios/NativeApp`
- Host app target: `ios/WhereKindergartenNative`
- Keep the existing Capacitor app separate until native handoff is complete.

## Structure
- `Sources/Models`: shared payload and domain models mapped from the web contracts.
- `Sources/Services`: distance, deep link, persistence, repository, and remote-fallback behavior.
- `Sources/Features`: SwiftUI screens for Search, Compare, Saved, and More.
- `Sources/AppShell`: tab shell and root composition used by the host app.
- `Config`: plist and entitlements shared by the host app target.

## Local verification
- Package tests: `cd ios/NativeApp && swift test`
- Host app build: `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' build`
- Install and launch the built host app in Simulator before handoff.

## Kakao local setup
1. Copy `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig` to `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`.
2. Fill `WK_KAKAO_NATIVE_APP_KEY` and `WK_KAKAO_REST_API_KEY`.
3. Confirm `ios/WhereKindergartenNative/Config/WhereKindergartenNative.xcconfig` still includes `#include? "KakaoKeys.local.xcconfig"`.
4. Rebuild the host app.

If `KakaoKeys.local.xcconfig` is absent or unresolved, the app intentionally falls back to local kindergarten suggestions plus recent searches and will not enable live Kakao Local suggestions.

2026-03-19 measured runtime state:
- Kakao Local REST requests succeed with the injected `WK_KAKAO_REST_API_KEY`.
- Kakao Maps SDK auth in Simulator currently fails with `401 Unauthorized`; the native search screen now surfaces that as a visible failure placeholder instead of leaving the map area blank.

## Deep links
- Universal compare: `https://where-kindergarden.vercel.app/compare?ids=...`
- Custom compare: `wherekindergarten://compare?ids=...`
- Universal search: `https://where-kindergarden.vercel.app/search?q=...`
- Custom search: `wherekindergarten://search?q=...`

Use real bundled catalog IDs for runtime verification, for example:
- `1ecec08c-f026-b044-e053-0a32095ab044`
- `1ecec08c-f490-b044-e053-0a32095ab044`

## Handoff docs
- Status: `docs/NATIVE_IOS_MIGRATION_STATUS.md`
- Smoke and release checklist: `docs/NATIVE_IOS_HANDOFF_CHECKLIST.md`

## Real-device prerequisites
- The provisioning profile used for `ios/WhereKindergartenNative` must include `Associated Domains`.
- `https://where-kindergarden.vercel.app/.well-known/apple-app-site-association` must return `200` before universal links can bind on-device.
- As of 2026-03-19, a connected iPhone build still fails because the active team provisioning profile does not include `Associated Domains`.
