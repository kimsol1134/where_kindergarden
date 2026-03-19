import AppShell
import SwiftUI

@main
struct WhereKindergartenNativeHostApp: App {
    var body: some Scene {
        WindowGroup {
            NativeRootView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }
}
