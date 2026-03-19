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
        VStack(spacing: 16) {
            ZStack(alignment: .bottomTrailing) {
                BrandGlyphView(size: 58, cornerRadius: 18)

                Image(systemName: icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundStyle(inkBlack)
                    .padding(10)
                    .background(sunYellow.opacity(0.92), in: Circle())
                    .overlay(
                        Circle()
                            .stroke(paperWhite.opacity(0.92), lineWidth: 1)
                    )
                    .offset(x: 8, y: 6)
            }

            NativeBadge("바로 확인해보세요", tone: .slate)

            Text(title)
                .font(.headline.weight(.semibold))
                .foregroundStyle(inkBlack)
                .multilineTextAlignment(.center)

            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(slateBlue)

            if let ctaLabel, let ctaAction {
                Button(action: ctaAction) {
                    HStack(spacing: 8) {
                        Text(ctaLabel)
                            .font(.subheadline.weight(.semibold))
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.body)
                    }
                    .foregroundStyle(inkBlack)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(jadeGreen.opacity(0.22), in: Capsule())
                    .overlay(
                        Capsule()
                            .stroke(jadeGreen.opacity(0.20), lineWidth: 1)
                    )
                }
                .buttonStyle(.plain)
                .padding(.top, 4)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 32)
        .padding(.horizontal, 22)
        .solidPanel(cornerRadius: 30, tint: paperWhite.opacity(0.92))
    }
}
