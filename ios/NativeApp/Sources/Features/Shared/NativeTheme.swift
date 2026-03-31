import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct NativeScreenBackground: View {
    private let topTintOpacity: Double

    public init(topTintOpacity: Double = 0.18) {
        self.topTintOpacity = topTintOpacity
    }

    public var body: some View {
        let base = Color(red: 0.98, green: 0.992, blue: 0.973)

        ZStack {
            base

            // Watercolor wash stains — organic shapes with radial gradients
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [jadeGreen.opacity(topTintOpacity), jadeGreen.opacity(0.06), .clear],
                        center: UnitPoint(x: 0.3, y: 0.4),
                        startRadius: 0,
                        endRadius: 140
                    )
                )
                .frame(width: 280, height: 220)
                .offset(x: 100, y: -280)
                .blur(radius: 40)

            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [sunYellow.opacity(0.22), sunYellow.opacity(0.08), .clear],
                        center: UnitPoint(x: 0.6, y: 0.5),
                        startRadius: 0,
                        endRadius: 120
                    )
                )
                .frame(width: 240, height: 200)
                .offset(x: -120, y: -40)
                .blur(radius: 40)

            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [jadeGreen.opacity(0.12), jadeGreen.opacity(0.04), .clear],
                        center: UnitPoint(x: 0.4, y: 0.6),
                        startRadius: 0,
                        endRadius: 130
                    )
                )
                .frame(width: 200, height: 260)
                .offset(x: 80, y: 200)
                .blur(radius: 40)

            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [sunYellow.opacity(0.14), sunYellow.opacity(0.04), .clear],
                        center: UnitPoint(x: 0.5, y: 0.3),
                        startRadius: 0,
                        endRadius: 160
                    )
                )
                .frame(width: 320, height: 180)
                .offset(x: -60, y: 300)
                .blur(radius: 40)

            // Bleed layers — softer, deeper blur
            Ellipse()
                .fill(jadeGreen.opacity(0.08))
                .frame(width: 160, height: 140)
                .offset(x: 60, y: -180)
                .blur(radius: 60)

            Ellipse()
                .fill(sunYellow.opacity(0.10))
                .frame(width: 180, height: 120)
                .offset(x: -40, y: 80)
                .blur(radius: 60)
        }
        .ignoresSafeArea()
    }
}

public struct BrandGlyphView: View {
    private let size: CGFloat
    private let cornerRadius: CGFloat

    public init(size: CGFloat = 44, cornerRadius: CGFloat = 14) {
        self.size = size
        self.cornerRadius = cornerRadius
    }

    public var body: some View {
        Group {
            #if canImport(UIKit)
            if UIImage(named: "BrandGlyph") != nil {
                Image("BrandGlyph", bundle: .main)
                    .resizable()
                    .renderingMode(.original)
            } else {
                fallbackGlyph
            }
            #else
            fallbackGlyph
            #endif
        }
        .scaledToFill()
        .frame(width: size, height: size)
        .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .stroke(paperWhite.opacity(0.92), lineWidth: 1)
        )
        .shadow(color: inkBlack.opacity(0.10), radius: 14, y: 6)
    }

    private var fallbackGlyph: some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(paperWhite)

            Circle()
                .fill(sunYellow.opacity(0.86))
                .frame(width: size * 0.38, height: size * 0.38)
                .offset(x: -size * 0.18, y: size * 0.16)

            RoundedRectangle(cornerRadius: cornerRadius * 0.8, style: .continuous)
                .fill(jadeGreen.opacity(0.82))
                .frame(width: size * 0.48, height: size * 0.54)
                .offset(x: size * 0.04, y: size * 0.08)

            Circle()
                .stroke(warmSand.opacity(0.9), lineWidth: size * 0.09)
                .frame(width: size * 0.42, height: size * 0.42)
                .overlay(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(warmSand.opacity(0.9))
                        .frame(width: size * 0.24, height: size * 0.09)
                        .rotationEffect(.degrees(44))
                        .offset(x: size * 0.16, y: size * 0.16)
                )
        }
    }
}

public struct NativeScreenHeader<Accessory: View>: View {
    private let eyebrow: String?
    private let title: String
    private let subtitle: String
    private let accessory: Accessory

    public init(
        eyebrow: String? = nil,
        title: String,
        subtitle: String,
        @ViewBuilder accessory: () -> Accessory = { EmptyView() }
    ) {
        self.eyebrow = eyebrow
        self.title = title
        self.subtitle = subtitle
        self.accessory = accessory()
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                if let eyebrow {
                    Text(eyebrow)
                        .font(.caption2.weight(.black))
                        .foregroundStyle(slateSoft)
                        .textCase(.uppercase)
                }
                Spacer(minLength: 12)
                accessory
            }

            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(inkBlack)
                .fixedSize(horizontal: false, vertical: true)

            Text(subtitle)
                .font(.footnote)
                .foregroundStyle(slateBlue)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}

public struct NativeBadge: View {
    public enum Tone {
        case jade
        case sun
        case slate
        case sand

        fileprivate var foreground: Color {
            switch self {
            case .jade: return jadeDeep
            case .sun: return inkBlack
            case .slate: return slateBlue
            case .sand: return sandDeep
            }
        }

        fileprivate var background: Color {
            switch self {
            case .jade: return jadeGreen.opacity(0.20)
            case .sun: return sunYellow.opacity(0.30)
            case .slate: return slateBlue.opacity(0.10)
            case .sand: return warmSand.opacity(0.26)
            }
        }

        fileprivate var stroke: Color {
            switch self {
            case .jade: return jadeGreen.opacity(0.22)
            case .sun: return sunYellow.opacity(0.38)
            case .slate: return slateBlue.opacity(0.16)
            case .sand: return warmSand.opacity(0.34)
            }
        }
    }

    private let label: String
    private let tone: Tone

    public init(_ label: String, tone: Tone = .jade) {
        self.label = label
        self.tone = tone
    }

    public var body: some View {
        Text(label)
            .font(.caption2.weight(.bold))
            .foregroundStyle(tone.foreground)
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(tone.background, in: Capsule())
            .overlay(
                Capsule()
                    .stroke(tone.stroke, lineWidth: 1)
            )
    }
}

public struct NativeMetricTile: View {
    private let label: String
    private let value: String
    private let accent: Color

    public init(label: String, value: String, accent: Color = jadeGreen) {
        self.label = label
        self.value = value
        self.accent = accent
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(label)
                .font(.caption)
                .foregroundStyle(slateSoft)
            Text(value)
                .font(.headline.weight(.semibold))
                .foregroundStyle(inkBlack)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(14)
        .frame(maxWidth: .infinity, minHeight: 86, alignment: .topLeading)
        .solidPanel(cornerRadius: 20, tint: accent.opacity(0.03))
    }
}

public extension View {
    func glassPanel(cornerRadius: CGFloat = CornerRadius.large) -> some View {
        modifier(NativeGlassPanelModifier(cornerRadius: cornerRadius))
    }

    func solidPanel(cornerRadius: CGFloat = CornerRadius.large, tint: Color = paperWhite) -> some View {
        modifier(NativeSolidPanelModifier(cornerRadius: cornerRadius, tint: tint))
    }

    func nativeSectionPanel(cornerRadius: CGFloat = CornerRadius.large) -> some View {
        modifier(NativeSectionPanelModifier(cornerRadius: cornerRadius))
    }
}

public struct PressableCardStyle: ButtonStyle {
    public init() {}

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .opacity(configuration.isPressed ? 0.92 : 1.0)
            .animation(.spring(duration: 0.2), value: configuration.isPressed)
    }
}

private struct NativeGlassPanelModifier: ViewModifier {
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(paperWhite.opacity(0.74))
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(paperWhite.opacity(0.84), lineWidth: 1)
            )
            .shadow(color: inkBlack.opacity(0.08), radius: 24, y: 10)
    }
}

private struct NativeSolidPanelModifier: ViewModifier {
    let cornerRadius: CGFloat
    let tint: Color

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(tint)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(paperWhite.opacity(0.92), lineWidth: 1)
            )
            .shadow(color: inkBlack.opacity(0.06), radius: 18, y: 8)
    }
}

private struct NativeSectionPanelModifier: ViewModifier {
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .padding(18)
            .solidPanel(cornerRadius: cornerRadius, tint: paperWhite.opacity(0.94))
    }
}

#if canImport(UIKit)
@MainActor
public func configureNativeTabBarAppearance() {
    let appearance = UITabBarAppearance()
    appearance.configureWithTransparentBackground()
    appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterialLight)
    appearance.backgroundColor = UIColor(cloudWhite).withAlphaComponent(0.84)
    appearance.shadowColor = UIColor(lineSoft)

    let normal = appearance.stackedLayoutAppearance.normal
    normal.iconColor = UIColor(slateSoft)
    normal.titleTextAttributes = [.foregroundColor: UIColor(slateSoft)]

    let selected = appearance.stackedLayoutAppearance.selected
    selected.iconColor = UIColor(jadeDeep)
    selected.titleTextAttributes = [.foregroundColor: UIColor(jadeDeep)]

    appearance.inlineLayoutAppearance = appearance.stackedLayoutAppearance
    appearance.compactInlineLayoutAppearance = appearance.stackedLayoutAppearance

    let tabBar = UITabBar.appearance()
    tabBar.standardAppearance = appearance
    tabBar.scrollEdgeAppearance = appearance
    tabBar.tintColor = UIColor(jadeDeep)
    tabBar.unselectedItemTintColor = UIColor(slateSoft)
}
#endif
