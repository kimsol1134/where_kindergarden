import SwiftUI

struct CompareFloatingBar: View {
    let count: Int
    let names: [String]
    let onNavigateToCompare: () -> Void
    let onRemoveAt: (Int) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var statusText: String {
        switch count {
        case 1: return "1곳 선택됨 · 비교할 곳을 더 담아보세요"
        case 2: return "2곳 비교하기"
        case 3: return "3곳 비교하기"
        default: return ""
        }
    }

    private var isCtaEnabled: Bool {
        count >= 2
    }

    var body: some View {
        Button(action: onNavigateToCompare) {
            HStack(spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("비교 중 \(count)곳")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(slateSoft)
                        .textCase(.uppercase)
                    Text(names.joined(separator: " · "))
                        .font(.caption)
                        .foregroundStyle(slateBlue)
                        .lineLimit(1)
                    Text(statusText)
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
        .padding(.vertical, 14)
        .glassPanel(cornerRadius: 28)
        .padding(.horizontal, 16)
        .padding(.bottom, 2)
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .accessibilityIdentifier("search.compareBar")
    }
}
