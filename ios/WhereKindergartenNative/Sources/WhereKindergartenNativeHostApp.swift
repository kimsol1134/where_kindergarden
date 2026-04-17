import AppShell
import Services
import SwiftUI

@main
struct WhereKindergartenNativeHostApp: App {
    init() {
        let config = NativeAppConfiguration.live(bundle: .main)
        if let token = config.mixpanelToken {
            let sessionTracker = SessionTracker()
            let deviceInfo = DeviceInfo.current()
            MixpanelAnalytics.shared.configure(
                token: token,
                sessionTracker: sessionTracker,
                deviceInfo: deviceInfo
            )
        }
    }

    var body: some Scene {
        WindowGroup {
            NativeRootView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
