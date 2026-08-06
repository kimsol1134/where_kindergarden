import Models
import Services
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

private let compareBestTint = Color.blue.opacity(0.10)
private let compareBestForeground = Color(red: 0.18, green: 0.38, blue: 0.68)

public struct CompareView: View {
    var viewModel: CompareViewModel
    @State private var systemShareItem: SystemShareItem?

    public init(viewModel: CompareViewModel) {
        self.viewModel = viewModel
    }

    private var items: [Kindergarten] {
        viewModel.comparedKindergartens
    }

    public var body: some View {
        let scores = items.count >= 2 ? viewModel.scores : []

        NavigationStack {
            VStack(spacing: 0) {
                if items.count >= 2 {
                    CompareNameBar(
                        items: items,
                        scores: scores,
                        onRemove: { item in viewModel.removeKindergarten(item) }
                    )
                }

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        if items.isEmpty {
                            EmptyStateView(
                                icon: "square.split.2x2",
                                title: "비교할 곳이 아직 없어요",
                                message: "탐색에서 비교 버튼을 누르면 여기에 모여요.",
                                ctaLabel: "탐색하러 가기",
                                ctaAction: { viewModel.navigateToSearch() }
                            )
                            .accessibilityIdentifier("compare.emptyState")
                        } else if items.count == 1 {
                            HStack(spacing: 8) {
                                CompareHeaderCard(item: items[0], score: 0) {
                                    viewModel.removeKindergarten(items[0])
                                }

                                Button {
                                    viewModel.navigateToSearch()
                                } label: {
                                    VStack(spacing: 6) {
                                        Image(systemName: "plus.circle")
                                            .font(.body)
                                            .foregroundStyle(slateSoft)
                                        Text("추가")
                                            .font(.caption2.weight(.medium))
                                            .foregroundStyle(slateSoft)
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 72)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous)
                                            .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
                                            .foregroundStyle(slateSoft.opacity(0.3))
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        } else {
                            let reviewCounts = items.map { viewModel.reviews(for: $0.kindercode).count }
                            let vacancyCounts = items.map { viewModel.vacancyCount(for: $0.kindercode) }

                            if let summary = viewModel.winnerSummary {
                                Label(summary, systemImage: "crown.fill")
                                    .font(.subheadline.weight(.semibold))
                                    .foregroundStyle(Color(red: 0.55, green: 0.40, blue: 0.05))
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .background(sunYellow.opacity(0.18), in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
                            }

                            CompareMatrixView(
                                items: items,
                                reviewCounts: reviewCounts,
                                vacancyCounts: vacancyCounts
                            )
                        }

                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 20)
                }
            }
            .background { NativeScreenBackground() }
            .navigationTitle("비교")
            .navigationBarTitleDisplayMode(.large)
            .safeAreaInset(edge: .top, alignment: .trailing) {
                CompareBadge(count: items.count)
                    .padding(.trailing, 20)
                    .padding(.top, -36)
            }
            .safeAreaInset(edge: .bottom) {
                if items.count >= 2 {
                    shareActions
                        .padding(.horizontal, 20)
                        .padding(.vertical, 12)
                        .glassPanel(cornerRadius: 0)
                }
            }
            .onAppear {
                viewModel.trackCompareViewed()
            }
            .sheet(item: $systemShareItem) { item in
                SystemShareSheet(activityItems: [
                    item.url,
                    NativeAppConfiguration.shareDescription,
                ]) { result in
                    viewModel.trackShareResult(method: "system", result: result)
                }
            }
        }
    }

    @ViewBuilder
    private var shareActions: some View {
        if viewModel.shareURL() != nil {
            VStack(spacing: 12) {
                #if canImport(KakaoSDKShare)
                if KakaoShareService.isKakaoTalkAvailable {
                    Button {
                        if let url = viewModel.shareKakao(names: items.map(\.name)) {
                            KakaoShareService.shareCompare(
                                names: items.map(\.name),
                                shareURL: url
                            ) { didOpenKakao in
                                viewModel.trackShareResult(
                                    method: "kakao",
                                    result: didOpenKakao ? .handoffSucceeded : .failed
                                )
                            }
                        }
                    } label: {
                        Label("카카오톡으로 보내기", systemImage: "message.fill")
                            .frame(maxWidth: .infinity)
                            .foregroundStyle(inkBlack)
                            .padding(.horizontal, 18)
                            .padding(.vertical, 14)
                            .background(sunYellow, in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
                    }
                    .accessibilityIdentifier("compare.kakaoShareButton")
                    .buttonStyle(.plain)
                }
                #endif

                Button {
                    if let shareURL = viewModel.shareSystem() {
                        systemShareItem = SystemShareItem(url: shareURL)
                    }
                } label: {
                    Label("가족에게 비교표 보내기", systemImage: "square.and.arrow.up.fill")
                        .frame(maxWidth: .infinity)
                        .foregroundStyle(inkBlack)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 14)
                        .background(jadeGreen.opacity(0.24), in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
                }
                .accessibilityIdentifier("compare.shareButton")
                .buttonStyle(.plain)
            }
        } else {
            Label("가족에게 비교표 보내기", systemImage: "square.and.arrow.up.fill")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(slateSoft)
        }
    }

// MARK: - CompareHeaderCard

private struct SystemShareItem: Identifiable {
    let id = UUID()
    let url: URL
}

#if canImport(UIKit)
private struct SystemShareSheet: UIViewControllerRepresentable {
    let activityItems: [Any]
    let onResult: (CompareViewModel.ShareResult) -> Void

    func makeUIViewController(context: Context) -> UIActivityViewController {
        let controller = UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
        controller.completionWithItemsHandler = { _, completed, _, error in
            if error != nil {
                onResult(.failed)
            } else {
                onResult(completed ? .completed : .cancelled)
            }
        }
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
#else
private struct SystemShareSheet: View {
    let activityItems: [Any]
    let onResult: (CompareViewModel.ShareResult) -> Void

    var body: some View {
        EmptyView()
    }
}
#endif

private struct CompareHeaderCard: View {
    let item: Kindergarten
    let score: Int
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .top) {
                Text(shortenKindergartenName(item.name))
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(inkBlack)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Spacer(minLength: 4)
                Button(action: onRemove) {
                    Image(systemName: "minus.circle.fill")
                        .font(.footnote)
                        .foregroundStyle(slateSoft)
                        .frame(width: 32, height: 32)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
            }

            Text("\(item.type.label) \(item.distance >= 0 ? String(format: "%.1fkm", item.distance) : "")")
                .font(.caption2.weight(.medium))
                .foregroundStyle(slateSoft)

            if score > 0 {
                Text("\(score)개 우세")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(compareBestForeground)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(compareBestTint, in: Capsule())
            }
        }
        .padding(10)
        .frame(maxWidth: .infinity, alignment: .leading)
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.94))
        .accessibilityIdentifier("compare.card.\(item.kindercode)")
        .accessibilityElement(children: .combine)
    }

}

}

private let nameBarDotColors: [Color] = [jadeDeep, amberOrange, slateBlue]

private struct CompareNameBar: View {
    let items: [Kindergarten]
    let scores: [Int]
    let onRemove: (Kindergarten) -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 6) {
                ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                    VStack(spacing: 4) {
                        HStack(spacing: 4) {
                            Circle()
                                .fill(nameBarDotColors[index % nameBarDotColors.count])
                                .frame(width: 7, height: 7)
                            Text(shortenKindergartenName(item.name))
                                .font(.subheadline.weight(.heavy))
                                .foregroundStyle(inkBlack)
                                .lineLimit(1)
                                .minimumScaleFactor(0.7)
                            Button { onRemove(item) } label: {
                                Image(systemName: "xmark")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(slateSoft)
                                    .frame(width: 18, height: 18)
                                    .background(slateSoft.opacity(0.12), in: Circle())
                                    .frame(width: 44, height: 44)
                                    .contentShape(Circle())
                            }
                            .buttonStyle(.plain)
                        }
                        if scores[index] > 0 {
                            Text("\(scores[index])개 우세")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(compareBestForeground)
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 10)

            Divider()
                .overlay(lineSoft)
        }
        .background(NativeScreenBackground())
    }
}

private struct CompareBadge: View {
    let count: Int

    private var label: String {
        count == 0 ? "최대 3곳" : "\(count) / 3곳"
    }

    private var foreground: Color {
        switch count {
        case 1: return jadeDeep
        case 2: return Color.orange
        case 3: return compareBestForeground
        default: return slateSoft
        }
    }

    private var background: Color {
        switch count {
        case 1: return jadeGreen.opacity(0.15)
        case 2: return sunYellow.opacity(0.20)
        case 3: return Color.blue.opacity(0.15)
        default: return slateSoft.opacity(0.10)
        }
    }

    var body: some View {
        Text(label)
            .font(.footnote.weight(.bold))
            .foregroundStyle(foreground)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(Capsule().fill(background))
    }
}

func shortenKindergartenName(_ name: String) -> String {
    name.replacingOccurrences(of: "유치원", with: "")
        .replacingOccurrences(of: "어린이집", with: "")
}
