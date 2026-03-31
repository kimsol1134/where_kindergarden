import Models
import SwiftUI

struct CompareFloatingBar: View {
    let count: Int
    let onNavigateToCompare: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isCtaEnabled: Bool { count >= 2 }

    var body: some View {
        Button(action: onNavigateToCompare) {
            HStack(spacing: 12) {
                HStack(spacing: 8) {
                    HStack(spacing: 4) {
                        ForEach(0..<CompareSelection.limit, id: \.self) { i in
                            Circle()
                                .fill(i < count ? jadeGreen : warmSand.opacity(0.36))
                                .frame(width: 8, height: 8)
                        }
                    }
                    Text("\(count)곳 선택")
                        .font(.subheadline.weight(.bold))
                        .foregroundStyle(inkBlack)
                }

                Spacer()

                ZStack {
                    Circle()
                        .fill(isCtaEnabled ? jadeGreen : warmSand.opacity(0.36))
                        .frame(width: 40, height: 40)
                    Image(systemName: "arrow.right")
                        .font(.system(size: 15, weight: .black))
                        .foregroundStyle(inkBlack.opacity(isCtaEnabled ? 1 : 0.52))
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!isCtaEnabled)
        .opacity(isCtaEnabled ? 1 : 0.7)
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        .glassPanel(cornerRadius: CornerRadius.large)
        .padding(.horizontal, 16)
        .padding(.bottom, 2)
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .accessibilityIdentifier("search.compareBar")
        .accessibilityLabel("\(count)곳 선택")
    }
}
