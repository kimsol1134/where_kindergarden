import SwiftUI

public struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var ctaLabel: String?
    var ctaAction: (() -> Void)?

    public init(
        icon: String,
        title: String,
        message: String,
        ctaLabel: String? = nil,
        ctaAction: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.ctaLabel = ctaLabel
        self.ctaAction = ctaAction
    }

    public var body: some View {
        VStack(spacing: 14) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundStyle(leafGreen)

            Text(title)
                .font(.headline.weight(.semibold))
                .multilineTextAlignment(.center)

            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            if let ctaLabel, let ctaAction {
                Button(action: ctaAction) {
                    Text(ctaLabel)
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .background(leafGreen, in: Capsule())
                        .foregroundStyle(.white)
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .padding(.horizontal, 20)
        .background(.white, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
    }
}
