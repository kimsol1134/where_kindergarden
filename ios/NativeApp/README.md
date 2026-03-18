# NativeApp

Separate SwiftUI-first iPhone app scaffold for `우리동네 유치원`.

## Structure
- `Sources/Models`: shared payload and domain models mapped from the web contracts.
- `Sources/Services`: distance, deep link, repository, and remote-fallback behavior.
- `Sources/Features`: SwiftUI screens for Search, Compare, Saved, and More.
- `Sources/AppShell`: tab shell and branded root composition.
- `Config`: template plist and entitlements for the eventual Xcode app target.

## Current Intent
- Keep the existing Capacitor app running until native search/detail/compare/share parity is reached.
- Treat this package as the source of truth for native models and view architecture.
- Use `../WhereKindergartenNative` as the dedicated host iOS app target for Simulator and local build verification.

## Local Build
- Package tests: `cd ios/NativeApp && swift test`
- Host app build: `xcodebuild -project ios/WhereKindergartenNative/WhereKindergartenNative.xcodeproj -scheme WhereKindergartenNative -destination 'generic/platform=iOS Simulator' build`

## Kakao Configuration
- Copy `ios/WhereKindergartenNative/Config/KakaoKeys.example.xcconfig` to `ios/WhereKindergartenNative/Config/KakaoKeys.local.xcconfig`.
- Fill `WK_KAKAO_NATIVE_APP_KEY` and `WK_KAKAO_REST_API_KEY` locally to enable the live Kakao map and remote address/place suggestions.

## Deep Linking
- Universal link: `https://where-kindergarden.vercel.app/compare?ids=...`
- Custom scheme: `wherekindergarten://compare?ids=...`
- Universal link search: `https://where-kindergarden.vercel.app/search?q=...`
- Custom scheme search: `wherekindergarten://search?q=...`
