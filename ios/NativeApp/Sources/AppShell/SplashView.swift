import Features
import SwiftUI

private let splashBackground = Color(red: 0.98, green: 0.992, blue: 0.973)
private let deepGreen = Color(red: 0.176, green: 0.353, blue: 0.239)
private let softGreen = Color(red: 0.616, green: 0.722, blue: 0.604)

struct SplashView: View {
    var onFinished: () -> Void

    @State private var entered = false
    @State private var opacity: Double = 1

    var body: some View {
        ZStack {
            splashBackground.ignoresSafeArea()

            // Sun glow — top right
            RadialGradient(
                colors: [sunYellow.opacity(0.16), .clear],
                center: .topTrailing,
                startRadius: 0,
                endRadius: 160
            )
            .frame(width: 200, height: 200)
            .position(x: UIScreen.main.bounds.width - 20, y: 20)

            // Search radius rings
            DashedRing(size: 224, dash: 8, gap: 6, color: leafGreen.opacity(0.16))
                .phaseAnimator([false, true]) { content, phase in
                    content
                        .scaleEffect(phase ? 1.06 : 1.0)
                        .opacity(phase ? 0.7 : 0.4)
                } animation: { _ in .easeInOut(duration: 3).repeatForever(autoreverses: true) }

            DashedRing(size: 288, dash: 6, gap: 8, color: leafGreen.opacity(0.08))
                .phaseAnimator([false, true]) { content, phase in
                    content
                        .scaleEffect(phase ? 1.05 : 1.0)
                        .opacity(phase ? 0.5 : 0.25)
                } animation: { _ in .easeInOut(duration: 3).repeatForever(autoreverses: true) }

            // Main content
            VStack(spacing: 0) {
                // Icon with scan sweep
                ZStack {
                    Image("BrandGlyph")
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(width: 112, height: 112)
                        .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                        .shadow(color: leafGreen.opacity(0.16), radius: 24, y: 16)

                    // Scan sweep light
                    ScanSweep()
                        .frame(width: 112, height: 112)
                        .clipShape(RoundedRectangle(cornerRadius: 32, style: .continuous))
                }
                .scaleEffect(entered ? 1.0 : 0.85)
                .opacity(entered ? 1.0 : 0)

                // Text group
                VStack(spacing: 10) {
                    Text("우리동네 유치원")
                        .font(.system(size: 26, weight: .heavy))
                        .tracking(-0.5)
                        .foregroundStyle(deepGreen)

                    HStack(spacing: 6) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 14, weight: .semibold))
                            .rotationEffect(.degrees(entered ? 0 : -10))
                            .animation(
                                .easeInOut(duration: 2).repeatForever(autoreverses: true),
                                value: entered
                            )

                        Text("우리 아이에게 맞는 곳을 찾아볼게요")
                            .font(.system(size: 14, weight: .medium))
                    }
                    .foregroundStyle(softGreen)
                }
                .padding(.top, 28)
                .offset(y: entered ? 0 : 12)
                .opacity(entered ? 1 : 0)
            }

            // Bottom loading bar
            VStack {
                Spacer()
                LoadingBar()
                    .padding(.bottom, 80)
            }
        }
        .opacity(opacity)
        .onAppear {
            withAnimation(.easeOut(duration: 0.7)) {
                entered = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
                withAnimation(.easeInOut(duration: 0.5)) {
                    opacity = 0
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    onFinished()
                }
            }
        }
    }
}

// MARK: - Dashed Ring

private struct DashedRing: View {
    let size: CGFloat
    let dash: CGFloat
    let gap: CGFloat
    let color: Color

    var body: some View {
        Circle()
            .strokeBorder(style: StrokeStyle(lineWidth: 1.5, dash: [dash, gap]))
            .foregroundStyle(color)
            .frame(width: size, height: size)
    }
}

// MARK: - Scan Sweep

private struct ScanSweep: View {
    @State private var offsetX: CGFloat = -40

    var body: some View {
        Rectangle()
            .fill(
                LinearGradient(
                    colors: [.clear, sunYellow.opacity(0.32), .clear],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .frame(width: 40)
            .rotationEffect(.degrees(-12))
            .offset(x: offsetX)
            .onAppear {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    startSweepLoop()
                }
            }
    }

    private func startSweepLoop() {
        offsetX = -60
        withAnimation(.easeInOut(duration: 1.5)) {
            offsetX = 160
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.5) {
            startSweepLoop()
        }
    }
}

// MARK: - Loading Bar

private struct LoadingBar: View {
    @State private var barOffset: CGFloat = -176

    var body: some View {
        RoundedRectangle(cornerRadius: 2)
            .fill(leafGreen.opacity(0.1))
            .frame(width: 176, height: 3)
            .overlay(
                RoundedRectangle(cornerRadius: 2)
                    .fill(
                        LinearGradient(
                            colors: [leafGreen, sunYellow, leafGreen],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                    .frame(width: 176, height: 3)
                    .offset(x: barOffset)
                    .mask(RoundedRectangle(cornerRadius: 2).frame(width: 176, height: 3))
            )
            .onAppear { startBarLoop() }
    }

    private func startBarLoop() {
        barOffset = -176
        withAnimation(.easeInOut(duration: 2)) {
            barOffset = 176
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            startBarLoop()
        }
    }
}
