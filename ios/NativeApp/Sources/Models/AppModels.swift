import Foundation

public enum NativeTab: Hashable {
    case search
    case compare
    case saved
    case more
}

public struct CompareToast: Equatable {
    public let id: UUID
    public let message: String
    public let icon: String
    public let isWarning: Bool

    public static func success(_ message: String) -> CompareToast {
        CompareToast(id: UUID(), message: message, icon: "checkmark.circle.fill", isWarning: false)
    }

    public static func warning(_ message: String) -> CompareToast {
        CompareToast(id: UUID(), message: message, icon: "exclamationmark.triangle.fill", isWarning: true)
    }
}

public enum SearchHomePresentationState: Equatable {
    case firstVisit
    case normal
    case permissionRecovery
}
