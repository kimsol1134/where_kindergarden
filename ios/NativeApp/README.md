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
- Attach these sources to a dedicated Xcode iOS app target once the separate native project is created.

## Deep Linking
- Universal link: `https://where-kindergarden.vercel.app/compare?ids=...`
- Custom scheme: `wherekindergarten://compare?ids=...`
