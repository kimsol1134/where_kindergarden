import Models
import SwiftUI

struct CompareFloatingBar: View {
    let count: Int
    let onNavigateToCompare: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var isCtaEnabled: Bool { count >= 2 }
    private var statusText: String {
        isCtaEnabled ? "\(count)/\(CompareSelection.limit)곳 선택됨" : "한 곳 더 담으면 비교할 수 있어요"
    }

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 4) {
                ForEach(0..<CompareSelection.limit, id: \.self) { i in
                    Circle()
                        .fill(i < count ? jadeGreen : warmSand.opacity(0.36))
                        .frame(width: 8, height: 8)
                }
            }
            .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(isCtaEnabled ? "비교표 보기" : "\(count)곳 선택")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(inkBlack)
                Text(statusText)
                    .font(.caption2.weight(.medium))
                    .foregroundStyle(slateBlue)
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
        .opacity(isCtaEnabled ? 1 : 0.7)
        .padding(.horizontal, 18)
        .padding(.vertical, 10)
        .glassPanel(cornerRadius: CornerRadius.large)
        .padding(.horizontal, 16)
        .padding(.bottom, 2)
        .contentShape(RoundedRectangle(cornerRadius: CornerRadius.large, style: .continuous))
        .onTapGesture {
            guard isCtaEnabled else { return }
            onNavigateToCompare()
        }
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .accessibilityIdentifier("search.compareBar")
        .accessibilityLabel(isCtaEnabled ? "비교표 보기, \(count)곳 선택됨" : "\(count)곳 선택, 한 곳 더 담으면 비교할 수 있어요")
        .accessibilityAddTraits(.isButton)
        .accessibilityAction {
            guard isCtaEnabled else { return }
            onNavigateToCompare()
        }
    }
}
