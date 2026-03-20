import SwiftUI

struct CompareFloatingBar: View {
    let count: Int
    let names: [String]
    let onNavigateToCompare: () -> Void
    let onRemoveAt: (Int) -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private var statusText: String {
        switch count {
        case 1: return "한 곳 더 담으면 바로 비교할 수 있어요"
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
                    Text("비교할 곳 \(count)곳")
                        .font(.caption.weight(.heavy))
                        .foregroundStyle(slateSoft)
                        .textCase(.uppercase)
                    HStack(spacing: 6) {
                        ForEach(Array(names.enumerated()), id: \.offset) { index, name in
                            HStack(spacing: 4) {
                                Text(name)
                                    .font(.caption)
                                    .foregroundStyle(slateBlue)
                                    .lineLimit(1)
                                Button {
                                    onRemoveAt(index)
                                } label: {
                                    Image(systemName: "xmark")
                                        .font(.system(size: 8, weight: .bold))
                                        .foregroundStyle(slateSoft)
                                }
                                .buttonStyle(.plain)
                            }
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(warmSand.opacity(0.18), in: Capsule())
                        }
                    }
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
        .glassPanel(cornerRadius: CornerRadius.large)
        .padding(.horizontal, 16)
        .padding(.bottom, 2)
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .accessibilityIdentifier("search.compareBar")
    }
}
