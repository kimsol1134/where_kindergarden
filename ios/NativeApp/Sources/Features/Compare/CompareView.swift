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
            ZStack {
                NativeScreenBackground()

                ScrollView {
                    VStack(alignment: .leading, spacing: 18) {
                        NativeScreenHeader(
                            eyebrow: "비교 센터",
                            title: "우리 집 비교",
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
                                title: "아직 비교할 유치원을 선택하지 않았습니다.",
                                message: "탐색 화면에서 비교 목록에 추가하면 여기서 거리, 공간, 후기 신호를 나란히 볼 수 있습니다.",
                                ctaLabel: "탐색으로 이동"
                            ) {
                                model.selectedTab = .search
                            }
                            .accessibilityIdentifier("compare.emptyState")
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

                            CompareConclusionCard(message: comparisonConclusion)
                        }

                        shareActions

                        #if canImport(GoogleMobileAds)
                        NativeAdBanner(adUnitID: model.configuration.adMobBannerUnitID)
                            .padding(.top, 8)
                        #endif
                    }
                    .padding(20)
                }
            }
        }
    }

    private var summaryLine: String {
        switch items.count {
        case 1:
            return "선택한 1곳의 핵심 지표입니다. 탐색 화면에서 최대 2곳까지 더 담아 비교할 수 있습니다."
        case 2:
            return "선택한 2곳의 통학, 운영, 후기 신호를 나란히 비교합니다."
        default:
            return "선택한 \(items.count)곳의 핵심 지표를 같은 기준으로 읽어봅니다."
        }
    }

    private var compareInsightTitle: String {
        guard let nearest = items.min(by: { $0.distance < $1.distance }) else {
            return "핵심 비교"
        }

        return "\(nearest.name)이 가장 가깝습니다"
    }

    private var comparisonWinnerLine: String {
        guard let nearest = items.min(by: { $0.distance < $1.distance }) else {
            return "선택한 기관을 같은 기준으로 읽어봅니다."
        }

        return "거리 기준으로는 \(nearest.name), 공간 기준으로는 \(items.max(by: { $0.areaPerChild < $1.areaPerChild })?.name ?? nearest.name)이 강합니다."
    }

    private var compareInsightMessage: String {
        let nearest = items.min(by: { $0.distance < $1.distance })
        let roomiest = items.max(by: { $0.areaPerChild < $1.areaPerChild })
        let mostReviewed = items.max(by: { model.reviews(for: $0.kindercode).count < model.reviews(for: $1.kindercode).count })

        var sentences: [String] = []

        if let nearest {
            sentences.append("거리 기준으로는 \(nearest.name)이 가장 짧습니다.")
        }

        if let roomiest {
            sentences.append("공간 기준으로는 \(roomiest.name)이 \(String(format: "%.1f㎡", roomiest.areaPerChild))로 가장 넓습니다.")
        }

        if let mostReviewed, model.reviews(for: mostReviewed.kindercode).count > 0 {
            sentences.append("후기 신호는 \(mostReviewed.name)이 가장 많습니다.")
        }

        return sentences.joined(separator: " ")
    }

    private var comparisonConclusion: String {
        let nearest = items.min(by: { $0.distance < $1.distance })
        let roomiest = items.max(by: { $0.areaPerChild < $1.areaPerChild })
        let mostReviewed = items.max(by: { model.reviews(for: $0.kindercode).count < model.reviews(for: $1.kindercode).count })

        var parts: [String] = []

        if let nearest {
            parts.append("등하원 안정성을 먼저 보면 \(nearest.name)")
        }

        if let roomiest, roomiest.kindercode != nearest?.kindercode {
            parts.append("공간 여유를 더 보면 \(roomiest.name)")
        }

        if let mostReviewed, model.reviews(for: mostReviewed.kindercode).count > 0 {
            parts.append("후기 신호는 \(mostReviewed.name)이 가장 많습니다")
        }

        return parts.joined(separator: " · ")
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
                            Label("카카오톡으로 공유", systemImage: "message.fill")
                            Spacer()
                        }
                        .foregroundStyle(inkBlack)
                        .padding(.horizontal, 18)
                        .padding(.vertical, 16)
                        .background(kakaoYellow, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                    }
                    .accessibilityIdentifier("compare.kakaoShareButton")
                    .buttonStyle(.plain)
                }
                #endif

                ShareLink(
                    item: shareURL,
                    subject: Text("우리동네 유치원 비교"),
                    message: Text(shareSummary)
                ) {
                    HStack {
                        Label("비교 결과 공유", systemImage: "square.and.arrow.up.fill")
                        Spacer()
                    }
                    .foregroundStyle(inkBlack)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 16)
                    .background(jadeGreen.opacity(0.24), in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                }
                .accessibilityIdentifier("compare.shareButton")
                .buttonStyle(.plain)
            }
            .nativeSectionPanel(cornerRadius: 28)
        } else {
            Label("비교 결과 공유", systemImage: "square.and.arrow.up.fill")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .solidPanel(cornerRadius: 24, tint: paperWhite.opacity(0.82))
                .foregroundStyle(slateSoft)
        }
    }

    private var shareSummary: String {
        let lines = items.map { item in
            "\(item.name) · \(item.address) · 정원 \(item.capacity)명 · 1인당 면적 \(String(format: "%.1f㎡", item.areaPerChild))"
        }

        return ([
            "우리동네 유치원 비교",
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
            NativeBadge("Best Fit", tone: .slate)
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(inkBlack)
            Text(summary)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(jadeDeep)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
        }
        .padding(20)
        .glassPanel(cornerRadius: 30)
    }
}

private struct CompareConclusionCard: View {
    let message: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("한 줄 판단")
                .font(.headline.weight(.semibold))
                .foregroundStyle(inkBlack)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
        }
        .nativeSectionPanel()
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
        .frame(width: 220, alignment: .leading)
        .solidPanel(cornerRadius: 28, tint: paperWhite.opacity(0.94))
        .accessibilityIdentifier("compare.card.\(item.kindercode)")
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

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("핵심 비교")
                .font(.headline.weight(.bold))
                .foregroundStyle(inkBlack)

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
                            .frame(maxWidth: .infinity, alignment: .center)
                            .lineLimit(1)
                    }
                }

                ForEach(rows) { row in
                    CompareMatrixRow(row: row)
                }
            }
            .padding(18)
            .solidPanel(cornerRadius: 28, tint: paperWhite.opacity(0.94))
        }
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
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(
                        row.highlightedIndexes.contains(index)
                            ? jadeGreen.opacity(0.18)
                            : paperWhite.opacity(0.86),
                        in: RoundedRectangle(cornerRadius: 18, style: .continuous)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 18, style: .continuous)
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
