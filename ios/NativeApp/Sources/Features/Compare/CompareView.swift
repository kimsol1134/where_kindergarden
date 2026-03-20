import Models
import Services
import SwiftUI

public struct CompareView: View {
    @ObservedObject private var model: NativeAppModel

    public init(model: NativeAppModel) {
        self.model = model
    }

    @MainActor public init() {
        self.model = .preview()
    }

    private var items: [Kindergarten] {
        model.comparedKindergartens()
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                        NativeScreenHeader(
                            eyebrow: "비교",
                            title: "나란히 보기",
                            subtitle: summaryLine
                        ) {
                            Text("최대 3곳")
                                .font(.footnote.weight(.semibold))
                                .foregroundStyle(inkBlack)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 10)
                                .background(sunYellow.opacity(0.28), in: Capsule())
                        }

                        if items.isEmpty {
                            EmptyStateView(
                                icon: "square.split.2x2",
                                title: "비교할 곳이 아직 없어요",
                                message: "탐색에서 비교 버튼을 누르면 여기에 모여요.",
                                ctaLabel: "탐색하러 가기"
                            ) {
                                model.selectedTab = .search
                            }
                            .accessibilityIdentifier("compare.emptyState")
                        } else {
                            if items.count == 1 {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 14) {
                                        ForEach(items) { item in
                                            CompareHeaderCard(item: item) {
                                                model.toggleCompare(for: item)
                                            }
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }

                                VStack(alignment: .leading, spacing: 12) {
                                    Text("한 곳 더 담으면 바로 비교할 수 있어요")
                                        .font(.subheadline)
                                        .foregroundStyle(slateBlue)
                                    Button {
                                        model.selectedTab = .search
                                    } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: "plus.circle.fill")
                                            Text("탐색에서 추가하기")
                                        }
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(inkBlack)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 12)
                                        .background(jadeGreen.opacity(0.22), in: Capsule())
                                    }
                                    .buttonStyle(.plain)
                                }
                                .nativeSectionPanel()
                            } else {
                                CompareInsightCard(
                                    title: compareInsightTitle,
                                    message: compareInsightMessage,
                                    summary: comparisonWinnerLine
                                )

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 14) {
                                        ForEach(items) { item in
                                            CompareHeaderCard(item: item) {
                                                model.toggleCompare(for: item)
                                            }
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }

                                CompareMatrix(items: items, reviewCounts: items.map { model.reviews(for: $0.kindercode).count })
                            }
                        }

                        if !items.isEmpty {
                            shareActions
                        }

                        #if canImport(GoogleMobileAds)
                        NativeAdBanner(adUnitID: model.configuration.adMobBannerUnitID)
                            .padding(.top, 8)
                        #endif
                    }
                    .padding(.horizontal, 20)
                    .padding(.top, 12)
                    .padding(.bottom, 20)
                }
            .background { NativeScreenBackground() }
        }
    }

    private var summaryLine: String {
        switch items.count {
        case 1:
            return "선택한 곳을 먼저 살펴보고 있어요. 최대 2곳 더 담아 비교할 수 있어요."
        case 2:
            return "선택한 2곳을 한눈에 비교해 보세요."
        default:
            return "선택한 \(items.count)곳을 같은 기준으로 비교해요."
        }
    }

    private var compareInsightTitle: String {
        guard let nearest = items.min(by: { $0.distance < $1.distance }) else {
            return "비교 요약"
        }

        return "가장 가까운 곳은 \(nearest.name)입니다"
    }

    private var comparisonWinnerLine: String {
        guard let nearest = items.min(by: { $0.distance < $1.distance }) else {
            return "선택한 곳을 같은 기준으로 볼 수 있어요."
        }

        return "거리로는 \(nearest.name), 공간으로는 \(items.max(by: { $0.areaPerChild < $1.areaPerChild })?.name ?? nearest.name)이 돋보여요."
    }

    private var compareInsightMessage: String {
        let nearest = items.min(by: { $0.distance < $1.distance })
        let roomiest = items.max(by: { $0.areaPerChild < $1.areaPerChild })
        let mostReviewed = items.max(by: { model.reviews(for: $0.kindercode).count < model.reviews(for: $1.kindercode).count })

        var sentences: [String] = []

        if let nearest {
            sentences.append("가까운 곳을 먼저 보면 \(nearest.name)이 유리해요.")
        }

        if let roomiest {
            sentences.append("\(roomiest.name)은 1인당 \(String(format: "%.1f㎡", roomiest.areaPerChild))로 공간이 가장 넉넉해요.")
        }

        if let mostReviewed, !model.reviews(for: mostReviewed.kindercode).isEmpty {
            sentences.append("후기는 \(mostReviewed.name) 쪽이 더 많아요.")
        }

        return sentences.joined(separator: " ")
    }

    @ViewBuilder
    private var shareActions: some View {
        if let shareURL = model.compareShareURL() {
            VStack(spacing: 12) {
                #if canImport(KakaoSDKShare)
                if KakaoShareService.isKakaoTalkAvailable {
                    Button {
                        KakaoShareService.shareCompare(
                            names: items.map(\.name),
                            shareURL: shareURL
                        )
                    } label: {
                        HStack {
                            Label("카카오톡으로 보내기", systemImage: "message.fill")
                            Spacer()
                        }
                        .foregroundStyle(inkBlack)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)
                        .background(kakaoYellow, in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
                    }
                    .accessibilityIdentifier("compare.kakaoShareButton")
                    .buttonStyle(.plain)
                }
                #endif

                ShareLink(
                    item: shareURL,
                    subject: Text("유치원 비교"),
                    message: Text(shareSummary)
                ) {
                    HStack {
                        Label("비교 링크 공유", systemImage: "square.and.arrow.up.fill")
                        Spacer()
                    }
                    .foregroundStyle(inkBlack)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)
                    .background(jadeGreen.opacity(0.24), in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
                }
                .accessibilityIdentifier("compare.shareButton")
                .buttonStyle(.plain)
            }
            .nativeSectionPanel(cornerRadius: CornerRadius.large)
        } else {
            Label("비교 링크 공유", systemImage: "square.and.arrow.up.fill")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.82))
                .foregroundStyle(slateSoft)
        }
    }

    private var shareSummary: String {
        let lines = items.map { item in
            "\(item.name) · \(item.address) · 정원 \(item.capacity)명 · 1인당 면적 \(String(format: "%.1f㎡", item.areaPerChild))"
        }

        return ([
            "유치원 비교",
            lines.joined(separator: "\n"),
            model.compareShareURL()?.absoluteString ?? ""
        ])
        .filter { !$0.isEmpty }
        .joined(separator: "\n\n")
    }

private struct CompareInsightCard: View {
    let title: String
    let message: String
    let summary: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            NativeBadge("추천 포인트", tone: .slate)
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(inkBlack)
            Text(summary)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(jadeDeep)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
                .lineSpacing(3)
        }
        .padding(20)
        .glassPanel(cornerRadius: CornerRadius.large)
    }
}

private struct CompareHeaderCard: View {
    let item: Kindergarten
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                NativeBadge(item.type.label)
                Spacer()
                Button(action: onRemove) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(slateSoft)
                        .frame(width: 44, height: 44)
                        .contentShape(Circle())
                }
                .buttonStyle(.plain)
            }

            Text(item.name)
                .font(.headline.weight(.bold))
                .foregroundStyle(inkBlack)
            Text(item.address)
                .font(.footnote)
                .foregroundStyle(slateBlue)
                .lineLimit(2)

            if item.distance >= 0 {
                Text(String(format: "%.1fkm", item.distance))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(slateSoft)
            }
        }
        .padding(18)
        .frame(minWidth: 180, idealWidth: 220, maxWidth: 280, alignment: .leading)
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.94))
        .accessibilityIdentifier("compare.card.\(item.kindercode)")
        .accessibilityElement(children: .combine)
    }
}

private struct CompareMatrix: View {
    let items: [Kindergarten]
    let reviewCounts: [Int]

    private var headers: [String] {
        items.map(\.name)
    }

    private var rows: [CompareMatrixRowModel] {
        [
            CompareMatrixRowModel(
                title: "통학",
                values: items.map { $0.distance >= 0 ? String(format: "%.1fkm", $0.distance) : "미확인" },
                highlightedIndexes: highlightedIndexes(for: items.enumerated().min(by: { $0.element.distance < $1.element.distance })?.offset)
            ),
            CompareMatrixRowModel(
                title: "셔틀",
                values: items.map { $0.hasBus ? "\($0.busCount)대" : "없음" },
                highlightedIndexes: highestIndexes(items.map { $0.hasBus ? $0.busCount : 0 })
            ),
            CompareMatrixRowModel(
                title: "방과후",
                values: items.map { $0.hasAfterSchool ? "운영" : "미운영" },
                highlightedIndexes: highestIndexes(items.map { $0.hasAfterSchool ? 1 : 0 })
            ),
            CompareMatrixRowModel(
                title: "후기",
                values: reviewCounts.map { "\($0)건" },
                highlightedIndexes: highestIndexes(reviewCounts)
            ),
            CompareMatrixRowModel(
                title: "공간",
                values: items.map { String(format: "%.1f㎡", $0.areaPerChild) },
                highlightedIndexes: highestIndexes(items.map { Int($0.areaPerChild * 10) })
            ),
        ]
    }

    @ScaledMetric(relativeTo: .footnote) private var columnWidth: CGFloat = 100

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("비교표")
                .font(.headline.weight(.bold))
                .foregroundStyle(inkBlack)

            ScrollView(.horizontal, showsIndicators: false) {
                VStack(spacing: 10) {
                    HStack(spacing: 10) {
                        Text("항목")
                            .font(.caption.weight(.heavy))
                            .foregroundStyle(slateSoft)
                            .frame(width: 70, alignment: .leading)

                        ForEach(Array(headers.enumerated()), id: \.offset) { _, header in
                            Text(shortHeader(for: header))
                                .font(.caption.weight(.bold))
                                .foregroundStyle(inkBlack)
                                .frame(minWidth: columnWidth, maxWidth: .infinity, alignment: .center)
                                .lineLimit(1)
                        }
                    }

                    ForEach(rows) { row in
                        CompareMatrixRow(row: row)
                    }
                }
                .padding(18)
                .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.94))
                .scrollTargetLayout()
            }
            .scrollTargetBehavior(.viewAligned)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("비교표. \(items.count)곳 비교")
    }

    private func highlightedIndexes(for winningIndex: Int?) -> Set<Int> {
        guard let winningIndex else { return [] }
        return [winningIndex]
    }

    private func highestIndexes(_ values: [Int]) -> Set<Int> {
        guard let highest = values.max(), highest > 0 else { return [] }
        return Set(values.enumerated().compactMap { index, value in
            value == highest ? index : nil
        })
    }

    private func shortHeader(for name: String) -> String {
        name.replacingOccurrences(of: "유치원", with: "")
    }
}

private struct CompareMatrixRowModel: Identifiable {
    let id = UUID()
    let title: String
    let values: [String]
    let highlightedIndexes: Set<Int>
}

private struct CompareMatrixRow: View {
    let row: CompareMatrixRowModel
    @ScaledMetric(relativeTo: .footnote) private var columnWidth: CGFloat = 100

    var body: some View {
        HStack(spacing: 10) {
            Text(row.title)
                .font(.footnote.weight(.semibold))
                .foregroundStyle(slateBlue)
                .frame(width: 70, alignment: .leading)

            ForEach(Array(row.values.enumerated()), id: \.offset) { index, value in
                Text(value)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(row.highlightedIndexes.contains(index) ? inkBlack : slateBlue)
                    .frame(minWidth: columnWidth, maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        row.highlightedIndexes.contains(index)
                            ? jadeGreen.opacity(0.18)
                            : paperWhite.opacity(0.86),
                        in: RoundedRectangle(cornerRadius: CornerRadius.small, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: CornerRadius.small, style: .continuous)
                            .stroke(
                                row.highlightedIndexes.contains(index)
                                    ? jadeGreen.opacity(0.24)
                                    : lineSoft,
                                lineWidth: 1
                            )
                    )
                }
            }
        }
    }
}
