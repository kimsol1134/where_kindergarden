import SwiftUI

public struct EmptyStateView: View {
    let icon: String
    let title: String
    let message: String
    var ctaLabel: String?
    var ctaAction: (() -> Void)?
    var secondaryCTALabel: String?
    var secondaryCTAAction: (() -> Void)?

    @State private var appeared = false

    public init(
        icon: String,
        title: String,
        message: String,
        ctaLabel: String? = nil,
        ctaAction: (() -> Void)? = nil,
        secondaryCTALabel: String? = nil,
        secondaryCTAAction: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.ctaLabel = ctaLabel
        self.ctaAction = ctaAction
        self.secondaryCTALabel = secondaryCTALabel
        self.secondaryCTAAction = secondaryCTAAction
    }

    private var isErrorState: Bool {
        icon == "exclamationmark.triangle" || icon == "location.slash"
    }

    private var iconBackground: Color {
        isErrorState ? sunYellow.opacity(0.22) : jadeGreen.opacity(0.16)
    }

    private var iconForeground: Color {
        isErrorState ? amberOrange : jadeDeep
    }

    public var body: some View {
        VStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(iconBackground)
                    .frame(width: 80, height: 80)
                Image(systemName: icon)
                    .font(.title2.weight(.bold))
                    .foregroundStyle(iconForeground)
            }
            .accessibilityHidden(true)

            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(inkBlack)
                .multilineTextAlignment(.center)

            Text(message)
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(slateBlue)
                .lineSpacing(3)

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

            if let secondaryCTALabel, let secondaryCTAAction {
                Button(action: secondaryCTAAction) {
                    Text(secondaryCTALabel)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(slateBlue)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 36)
        .padding(.horizontal, 22)
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.95))
        .opacity(appeared ? 1 : 0)
        .offset(y: appeared ? 0 : 12)
        .onAppear {
            withAnimation(.spring(duration: 0.45, bounce: 0.15)) {
                appeared = true
            }
        }
        .accessibilityElement(children: .combine)
    }
}
