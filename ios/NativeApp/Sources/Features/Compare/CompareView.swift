import Models
import Services
import SwiftUI

private let compareBestTint = Color.blue.opacity(0.10)
private let compareBestForeground = Color(red: 0.18, green: 0.38, blue: 0.68)

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
                                ctaLabel: "탐색하러 가기",
                                ctaAction: { model.selectedTab = .search }
                            )
                            .accessibilityIdentifier("compare.emptyState")
                        } else {
                            if items.count == 1 {
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 14) {
                                        CompareHeaderCard(item: items[0], score: 0) {
                                            model.toggleCompare(for: items[0])
                                        }

                                        Button {
                                            model.selectedTab = .search
                                        } label: {
                                            VStack(spacing: 8) {
                                                Image(systemName: "plus.circle")
                                                    .font(.title2)
                                                    .foregroundStyle(slateSoft)
                                                Text("비교 대상 추가")
                                                    .font(.caption.weight(.medium))
                                                    .foregroundStyle(slateSoft)
                                            }
                                            .frame(minWidth: 170, idealWidth: 200, maxWidth: 260, minHeight: 120)
                                            .overlay(
                                                RoundedRectangle(cornerRadius: CornerRadius.large, style: .continuous)
                                                    .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [8, 6]))
                                                    .foregroundStyle(slateSoft.opacity(0.3))
                                            )
                                        }
                                        .buttonStyle(.plain)
                                    }
                                    .padding(.vertical, 4)
                                }
                            } else {
                                let scores = calculateScores()
                                let reviewCounts = items.map { model.reviews(for: $0.kindercode).count }
                                let vacancyCounts = items.map { model.vacancyCount(for: $0.kindercode) }

                                CompareQuickStats(
                                    items: items,
                                    reviewCounts: reviewCounts,
                                    vacancyCounts: vacancyCounts,
                                    scores: scores
                                )

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 14) {
                                        ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                                            CompareHeaderCard(item: item, score: scores[index]) {
                                                model.toggleCompare(for: item)
                                            }
                                        }
                                    }
                                    .padding(.vertical, 4)
                                }

                                CompareMatrixView(
                                    items: items,
                                    reviewCounts: reviewCounts,
                                    vacancyCounts: vacancyCounts
                                )
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

    // MARK: - Score calculation

    private func calculateScores() -> [Int] {
        guard items.count >= 2 else { return Array(repeating: 0, count: items.count) }
        var scores = Array(repeating: 0, count: items.count)

        // Teacher ratio: lower is better
        let ratios = items.map { $0.teacherCount > 0 ? Double($0.currentCount) / Double($0.teacherCount) : Double.infinity }
        if let minRatio = ratios.filter({ $0.isFinite }).min(), ratios.filter({ $0 == minRatio }).count < items.count {
            for (i, r) in ratios.enumerated() where r == minRatio { scores[i] += 1 }
        }

        // Area per child: higher is better
        let areas = items.map(\.areaPerChild)
        if let maxArea = areas.max(), maxArea > 0, Set(areas).count > 1 {
            for (i, item) in items.enumerated() where item.areaPerChild == maxArea { scores[i] += 1 }
        }

        // CCTV: more is better
        let cctvs = items.map(\.cctvCount)
        if let maxCctv = cctvs.max(), maxCctv > 0, Set(cctvs).count > 1 {
            for (i, item) in items.enumerated() where item.cctvCount == maxCctv { scores[i] += 1 }
        }

        // After school: having it is better (only when not all same)
        let afterSchools = items.map(\.hasAfterSchool)
        if Set(afterSchools).count > 1 {
            for (i, item) in items.enumerated() where item.hasAfterSchool { scores[i] += 1 }
        }

        // Playground: having it is better
        let playgrounds = items.map(\.hasPlayground)
        if Set(playgrounds).count > 1 {
            for (i, item) in items.enumerated() where item.hasPlayground { scores[i] += 1 }
        }

        // Meal: direct is better
        let meals = items.map(\.mealType)
        if Set(meals).count > 1 {
            for (i, item) in items.enumerated() where item.mealType == .direct { scores[i] += 1 }
        }

        // Bus: most is better (only when not all same)
        let buses = items.map { $0.hasBus ? $0.busCount : 0 }
        if let maxBus = buses.max(), maxBus > 0, Set(buses).count > 1 {
            for (i, b) in buses.enumerated() where b == maxBus { scores[i] += 1 }
        }

        return scores
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

// MARK: - CompareQuickStats

private struct CompareQuickStats: View {
    let items: [Kindergarten]
    let reviewCounts: [Int]
    let vacancyCounts: [Int]
    let scores: [Int]

    private var winnerSummary: String? {
        guard let maxScore = scores.max(), maxScore > 0 else { return nil }
        let winnerIndexes = scores.enumerated().filter { $0.element == maxScore }
        guard winnerIndexes.count == 1, let winner = winnerIndexes.first else { return nil }
        return "\(items[winner.offset].name)이 \(maxScore)개 항목에서 우세"
    }

    private var bestTeacherRatio: (name: String, value: String)? {
        let ratios: [(Int, Double)] = items.enumerated().compactMap { i, item in
            guard item.teacherCount > 0 else { return nil }
            return (i, Double(item.currentCount) / Double(item.teacherCount))
        }
        guard let best = ratios.min(by: { $0.1 < $1.1 }) else { return nil }
        return (items[best.0].name, String(format: "1:%.1f", best.1))
    }

    private var bestVacancy: (name: String, value: String)? {
        guard let maxVacancy = vacancyCounts.max(), maxVacancy > 0 else { return nil }
        if let index = vacancyCounts.firstIndex(of: maxVacancy) {
            return (items[index].name, "\(maxVacancy)자리")
        }
        return nil
    }

    private var directMealKinder: String? {
        items.first(where: { $0.mealType == .direct })?.name
    }

    private var bestReview: (name: String, value: String)? {
        guard let maxReview = reviewCounts.max(), maxReview > 0 else { return nil }
        if let index = reviewCounts.firstIndex(of: maxReview) {
            return (items[index].name, "\(maxReview)건")
        }
        return nil
    }

    private let columns = [
        GridItem(.flexible(), spacing: 10),
        GridItem(.flexible(), spacing: 10)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            NativeBadge("한눈에 비교", tone: .slate)

            if let summary = winnerSummary {
                Label(summary, systemImage: "crown.fill")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(Color(red: 0.55, green: 0.40, blue: 0.05))
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(sunYellow.opacity(0.18), in: Capsule())
            }

            LazyVGrid(columns: columns, spacing: 10) {
                quickStatTile(
                    icon: "person.2",
                    label: "교사 비율",
                    name: bestTeacherRatio?.name,
                    value: bestTeacherRatio?.value
                )
                quickStatTile(
                    icon: "chair.lounge",
                    label: "빈자리",
                    name: bestVacancy?.name,
                    value: bestVacancy?.value
                )
                quickStatTile(
                    icon: "fork.knife",
                    label: "급식",
                    name: directMealKinder,
                    value: directMealKinder != nil ? "직영" : nil
                )
                quickStatTile(
                    icon: "newspaper",
                    label: "후기",
                    name: bestReview?.name,
                    value: bestReview?.value
                )
            }
        }
        .padding(20)
        .glassPanel(cornerRadius: CornerRadius.large)
    }

    @ViewBuilder
    private func quickStatTile(icon: String, label: String, name: String?, value: String?) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(slateSoft)
                Text(label)
                    .font(.caption)
                    .foregroundStyle(slateSoft)
            }
            if let name, let value {
                Text(name)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(inkBlack)
                    .lineLimit(1)
                Text(value)
                    .font(.caption2)
                    .foregroundStyle(compareBestForeground)
            } else {
                Text("동일")
                    .font(.footnote)
                    .foregroundStyle(slateSoft)
            }
        }
        .padding(12)
        .frame(maxWidth: .infinity, minHeight: 80, alignment: .topLeading)
        .background(paperWhite.opacity(0.7), in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous)
                .stroke(lineSoft, lineWidth: 1)
        )
    }
}

// MARK: - CompareHeaderCard

private struct CompareHeaderCard: View {
    let item: Kindergarten
    let score: Int
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .top) {
                Text(item.name)
                    .font(.headline.weight(.bold))
                    .foregroundStyle(inkBlack)
                    .lineLimit(1)
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

            HStack(spacing: 6) {
                NativeBadge(item.type.label)
                if item.distance >= 0 {
                    Label(String(format: "%.1fkm", item.distance), systemImage: "mappin")
                        .font(.caption2.weight(.medium))
                        .foregroundStyle(slateSoft)
                }
            }

            Text(shortenAddress(item.address))
                .font(.caption)
                .foregroundStyle(slateBlue)
                .lineLimit(1)

            if score > 0 {
                Text("\(score)개 우세")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(compareBestForeground)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(compareBestTint, in: Capsule())
            }
        }
        .padding(18)
        .frame(minWidth: 180, idealWidth: 220, maxWidth: 280, alignment: .leading)
        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.94))
        .accessibilityIdentifier("compare.card.\(item.kindercode)")
        .accessibilityElement(children: .combine)
    }

    private func shortenAddress(_ address: String) -> String {
        let parts = address.split(separator: " ")
        guard parts.count >= 3 else { return address }
        return parts.dropFirst().prefix(2).joined(separator: " ")
    }
}

}
