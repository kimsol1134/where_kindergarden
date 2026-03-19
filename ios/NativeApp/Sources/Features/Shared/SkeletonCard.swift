import SwiftUI

struct SkeletonCard: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shimmerOffset: CGFloat = -200

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonLine(width: 160, height: 14)
            SkeletonLine(width: 220, height: 10)
            SkeletonLine(width: 140, height: 10)
        }
        .padding(18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.white.opacity(0.82), in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .mask(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
        )
        .overlay(
            Group {
                if !reduceMotion {
                    LinearGradient(
                        colors: [.clear, .white.opacity(0.4), .clear],
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
            .mask(RoundedRectangle(cornerRadius: 22, style: .continuous))
        )
    }
}

private struct SkeletonLine: View {
    let width: CGFloat
    let height: CGFloat

    var body: some View {
        RoundedRectangle(cornerRadius: height / 2)
            .fill(Color.secondary.opacity(0.15))
            .frame(width: width, height: height)
    }
}
