import SwiftUI

struct SkeletonCard: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmerOffset: CGFloat = -200

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonLine(widthRatio: 0.55, baseHeight: 14)
            SkeletonLine(widthRatio: 0.75, baseHeight: 10)
            SkeletonLine(widthRatio: 0.48, baseHeight: 10)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: 26, tint: paperWhite.opacity(0.78))
        .mask(
            RoundedRectangle(cornerRadius: 26, style: .continuous)
        )
        .overlay(
            Group {
                if !reduceMotion {
                    LinearGradient(
                        colors: [.clear, paperWhite.opacity(0.54), .clear],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                    .offset(x: shimmerOffset)
                    .onAppear {
                        withAnimation(.easeInOut(duration: 1.2).repeatForever(autoreverses: false)) {
                            shimmerOffset = 400
                        }
                    }
                }
            }
            .mask(RoundedRectangle(cornerRadius: 26, style: .continuous))
        )
        .accessibilityLabel("정보를 불러오는 중")
        .accessibilityHidden(false)
    }
}

private struct SkeletonLine: View {
    let widthRatio: CGFloat
    let baseHeight: CGFloat
    @ScaledMetric(relativeTo: .body) private var scale: CGFloat = 1.0

    var body: some View {
        let h = baseHeight * scale
        GeometryReader { proxy in
            RoundedRectangle(cornerRadius: h / 2)
                .fill(slateBlue.opacity(0.12))
                .frame(width: proxy.size.width * widthRatio, height: h)
        }
        .frame(height: h)
    }
}
