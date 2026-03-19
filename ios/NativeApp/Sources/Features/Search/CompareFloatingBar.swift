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
        VStack(spacing: 10) {
            HStack(spacing: 8) {
                ForEach(Array(names.enumerated()), id: \.offset) { index, name in
                    Button {
                        onRemoveAt(index)
                    } label: {
                        HStack(spacing: 4) {
                            Text(name)
                                .font(.caption2.weight(.semibold))
                                .lineLimit(1)
                            Image(systemName: "xmark")
                                .font(.system(size: 8, weight: .bold))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(.white.opacity(0.22), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }

            Button(action: onNavigateToCompare) {
                HStack {
                    Text(statusText)
                        .font(.subheadline.weight(.bold))
                    Spacer()
                    if isCtaEnabled {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.title2)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(!isCtaEnabled)
            .opacity(isCtaEnabled ? 1 : 0.7)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 14)
        .background(leafGreen, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
        .foregroundStyle(.white)
        .shadow(color: leafGreen.opacity(0.24), radius: 18, y: 8)
        .padding(.horizontal, 16)
        .padding(.bottom, 6)
        .transition(reduceMotion ? .opacity : .move(edge: .bottom).combined(with: .opacity))
        .accessibilityIdentifier("search.compareBar")
    }
}
