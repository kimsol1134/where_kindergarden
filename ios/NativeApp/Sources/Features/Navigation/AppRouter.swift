import Observation
import Models

@Observable
@MainActor
public final class AppRouter {
    public var activeTab: NativeTab = .search
    public var pendingDeepLink: DeepLinkDestination?
    public var toast: CompareToast?

    public init() {}

    public func showToast(_ toast: CompareToast) {
        self.toast = toast
    }

    public func dismissToast() {
        toast = nil
    }
}
