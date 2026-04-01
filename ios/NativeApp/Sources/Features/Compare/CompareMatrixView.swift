import Models
import SwiftUI

// MARK: - Public Interface

struct CompareMatrixView: View {
    let items: [Kindergarten]
    let reviewCounts: [Int]
    let vacancyCounts: [Int]

    @State private var showDiffsOnly = false
    @ScaledMetric(relativeTo: .footnote) private var columnWidth: CGFloat = 100

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("비교표")
                    .font(.headline.weight(.bold))
                    .foregroundStyle(inkBlack)
                Spacer()
                Button {
                    showDiffsOnly.toggle()
                } label: {
                    HStack(spacing: 5) {
                        Image(systemName: showDiffsOnly
                              ? "line.3.horizontal.decrease.circle.fill"
                              : "line.3.horizontal.decrease.circle")
                            .font(.footnote)
                        Text("차이점만")
                            .font(.footnote.weight(.semibold))
                    }
                    .foregroundStyle(showDiffsOnly ? jadeDeep : slateSoft)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 7)
                    .background(
                        showDiffsOnly ? jadeGreen.opacity(0.18) : slateBlue.opacity(0.08),
                        in: Capsule()
                    )
                }
                .buttonStyle(.plain)
                .animation(.easeInOut(duration: 0.2), value: showDiffsOnly)
            }

            if items.count <= 2 {
                tableContent
                    .padding(16)
                    .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.94))
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    tableContent
                        .padding(16)
                        .solidPanel(cornerRadius: CornerRadius.large, tint: paperWhite.opacity(0.94))
                        .scrollTargetLayout()
                }
                .scrollTargetBehavior(.viewAligned)
            }

            legendView
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("비교표. \(items.count)곳 비교")
    }
}

// MARK: - Table Content

private extension CompareMatrixView {
    var tableContent: some View {
        VStack(spacing: 6) {
            headerRow

            sectionHeader("핵심 비교")
            teacherRatioRow
            capacityRow
            vacancyRow

            sectionHeader("돌봄 환경")
            mealRow
            afterSchoolRow
            busRow

            sectionHeader("시설·안전")
            playgroundRow
            cctvRow
            areaRow

            sectionHeader("참고 정보")
            reviewRow
            establishRow
            phoneRow
        }
    }
}

// MARK: - Highlight System

private let bestTint = Color.blue.opacity(0.10)
private let bestBorder = Color.blue.opacity(0.20)
private let bestForeground = Color(red: 0.18, green: 0.38, blue: 0.68)

// MARK: - Header Row

private extension CompareMatrixView {
    var headerRow: some View {
        HStack(spacing: 10) {
            Text("항목")
                .font(.caption.weight(.heavy))
                .foregroundStyle(slateSoft)
                .frame(width: 70, alignment: .leading)

            ForEach(Array(items.enumerated()), id: \.element.id) { _, item in
                Text(shortHeader(for: item.name))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(inkBlack)
                    .frame(minWidth: columnWidth, maxWidth: .infinity, alignment: .center)
                    .lineLimit(1)
            }
        }
    }

    func shortHeader(for name: String) -> String {
        name.replacingOccurrences(of: "유치원", with: "")
            .replacingOccurrences(of: "어린이집", with: "")
    }
}

// MARK: - Section Header

private extension CompareMatrixView {
    func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.caption.weight(.bold))
            .foregroundStyle(slateSoft)
            .textCase(.uppercase)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.top, 10)
            .padding(.bottom, 2)
    }
}

// MARK: - Section 1: Core Comparison

private extension CompareMatrixView {
    // lower is better
    var teacherRatioRow: some View {
        let ratios: [Double] = items.map { item in
            item.teacherCount > 0
                ? Double(item.currentCount) / Double(item.teacherCount)
                : 0
        }
        let labels: [String] = ratios.map { ratio in
            ratio > 0 ? "1:\(String(format: "%.1f", ratio))" : "-"
        }
        let highlights = lowestHighlights(ratios)
        let allSame = Set(labels).count <= 1

        return conditionalRow(
            title: "교사비율",
            labels: labels,
            highlights: highlights,
            allSame: allSame
        )
    }

    var capacityRow: some View {
        let allSame = Set(items.map { "\($0.capacity)/\($0.currentCount)" }).count <= 1

        return conditionalRowContent(title: "현원/정원", allSame: allSame) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                let fillRate = item.capacity > 0
                    ? Double(item.currentCount) / Double(item.capacity)
                    : 0
                let barColor: Color = fillRate >= 0.9 ? amberOrange : jadeGreen

                VStack(spacing: 4) {
                    Text("\(item.currentCount) / \(item.capacity)명")
                        .font(.footnote.weight(.semibold))
                        .foregroundStyle(slateBlue)

                    GeometryReader { geo in
                        Capsule()
                            .fill(barColor.opacity(0.18))
                            .frame(height: 4)
                            .overlay(alignment: .leading) {
                                Capsule()
                                    .fill(barColor)
                                    .frame(
                                        width: geo.size.width * min(fillRate, 1.0),
                                        height: 4
                                    )
                            }
                    }
                    .frame(height: 4)
                }
                .frame(minWidth: columnWidth, maxWidth: .infinity)
                .padding(.vertical, 12)
                .cellBackground(highlighted: false)
            }
        }
    }

    var vacancyRow: some View {
        let labels: [String] = vacancyCounts.map { count in
            count > 0 ? "빈자리 \(count)명" : "없음"
        }
        let highlights = vacancyHighlights(vacancyCounts)
        let allSame = Set(vacancyCounts).count <= 1

        return conditionalRow(
            title: "결원",
            labels: labels,
            highlights: highlights,
            allSame: allSame,
            highlightFont: .footnote.weight(.bold)
        )
    }
}

// MARK: - Section 2: Care Environment

private extension CompareMatrixView {
    var mealRow: some View {
        let mealTypes = items.map(\.mealType)
        let labels = items.map { mealLabel(for: $0.mealType) }
        let highlights = mealHighlights(mealTypes)
        let allSame = Set(mealTypes.map(\.rawValue)).count <= 1

        return conditionalRow(
            title: "급식",
            labels: labels,
            highlights: highlights,
            allSame: allSame
        )
    }

    func mealLabel(for type: MealType) -> String {
        switch type {
        case .direct: return "직영"
        case .outsourced: return "위탁"
        case .none: return "없음"
        }
    }

    var afterSchoolRow: some View {
        let values = items.map(\.hasAfterSchool)
        let highlights = boolHighlights(values)
        let allSame = Set(values).count <= 1

        return conditionalRowContent(title: "방과후", allSame: allSame) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                Group {
                    if item.hasAfterSchool {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(jadeGreen)
                    } else {
                        Image(systemName: "xmark.circle")
                            .foregroundStyle(slateSoft.opacity(0.5))
                    }
                }
                .font(.body)
                .frame(minWidth: columnWidth, maxWidth: .infinity)
                .padding(.vertical, 12)
                .cellBackground(highlighted: highlights.contains(index))
            }
        }
    }

    var busRow: some View {
        let busCounts = items.map { $0.hasBus ? $0.busCount : 0 }
        let highlights = highestHighlights(busCounts)
        let allSame = Set(items.map { $0.hasBus }).count <= 1
            && Set(busCounts).count <= 1

        return conditionalRowContent(title: "셔틀", allSame: allSame) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                Group {
                    if item.hasBus {
                        Text("\(item.busCount)대")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(
                                highlights.contains(index) ? bestForeground : slateBlue
                            )
                    } else {
                        Image(systemName: "xmark.circle")
                            .font(.body)
                            .foregroundStyle(slateSoft.opacity(0.5))
                    }
                }
                .frame(minWidth: columnWidth, maxWidth: .infinity)
                .padding(.vertical, 12)
                .cellBackground(highlighted: highlights.contains(index))
            }
        }
    }
}

// MARK: - Section 3: Facilities & Safety

private extension CompareMatrixView {
    var playgroundRow: some View {
        let values = items.map(\.hasPlayground)
        let highlights = boolHighlights(values)
        let allSame = Set(values).count <= 1
            && Set(items.map { Int($0.outdoorPlaygroundArea) }).count <= 1

        return conditionalRowContent(title: "놀이터", allSame: allSame) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                VStack(spacing: 2) {
                    if item.hasPlayground {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(jadeGreen)
                            .font(.body)
                    } else {
                        Image(systemName: "xmark.circle")
                            .foregroundStyle(slateSoft.opacity(0.5))
                            .font(.body)
                    }

                    if item.outdoorPlaygroundArea > 0 {
                        Text(String(format: "%.0f\u{33A1}", item.outdoorPlaygroundArea))
                            .font(.caption2)
                            .foregroundStyle(slateSoft)
                    }
                }
                .frame(minWidth: columnWidth, maxWidth: .infinity)
                .padding(.vertical, 12)
                .cellBackground(highlighted: highlights.contains(index))
            }
        }
    }

    var cctvRow: some View {
        let counts = items.map(\.cctvCount)
        let highlights = highestHighlights(counts)
        let allSame = Set(counts).count <= 1

        return conditionalRow(
            title: "CCTV",
            labels: counts.map { "\($0)대" },
            highlights: highlights,
            allSame: allSame
        )
    }

    var areaRow: some View {
        let areas = items.map(\.areaPerChild)
        let labels = areas.map { String(format: "%.1f\u{33A1}", $0) }
        let highlights = highestHighlights(areas)
        let allSame = Set(labels).count <= 1

        return conditionalRow(
            title: "1인당면적",
            labels: labels,
            highlights: highlights,
            allSame: allSame
        )
    }
}

// MARK: - Section 4: Reference

private extension CompareMatrixView {
    var reviewRow: some View {
        let highlights = highestHighlights(reviewCounts)
        let labels = reviewCounts.map { "\($0)건" }
        let allSame = Set(reviewCounts).count <= 1

        return conditionalRow(
            title: "후기",
            labels: labels,
            highlights: highlights,
            allSame: allSame
        )
    }

    var establishRow: some View {
        let years = items.map { String($0.establishDate.prefix(4)) + "년" }
        let allSame = Set(years).count <= 1

        return conditionalRow(
            title: "설립",
            labels: years,
            highlights: [],
            allSame: allSame
        )
    }

    var phoneRow: some View {
        let phones = items.map(\.phone)
        let allSame = Set(phones.map { $0 ?? "" }).count <= 1

        return conditionalRowContent(title: "전화", allSame: allSame) {
            ForEach(Array(items.enumerated()), id: \.element.id) { index, item in
                Group {
                    if let phone = item.phone,
                       let url = URL(string: "tel://\(phone.filter(\.isNumber))") {
                        Link(destination: url) {
                            HStack(spacing: 4) {
                                Image(systemName: "phone.fill")
                                    .font(.caption)
                                Text(phone)
                                    .font(.caption2)
                            }
                            .foregroundStyle(jadeDeep)
                        }
                    } else {
                        Text("-")
                            .font(.footnote)
                            .foregroundStyle(slateSoft.opacity(0.5))
                    }
                }
                .frame(minWidth: columnWidth, maxWidth: .infinity)
                .padding(.vertical, 12)
                .cellBackground(highlighted: false)
            }
        }
    }
}

// MARK: - Legend

private extension CompareMatrixView {
    var legendView: some View {
        HStack(spacing: 6) {
            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .fill(bestTint)
                .overlay(
                    RoundedRectangle(cornerRadius: 3, style: .continuous)
                        .stroke(bestBorder, lineWidth: 1)
                )
                .frame(width: 14, height: 14)
            Text("비교 대상 중 가장 우수한 조건")
                .font(.caption2)
                .foregroundStyle(slateSoft)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 6)
    }
}

// MARK: - Reusable Row Builders

private extension CompareMatrixView {
    /// Simple text-based row with optional highlight.
    @ViewBuilder
    func conditionalRow(
        title: String,
        labels: [String],
        highlights: Set<Int>,
        allSame: Bool,
        highlightFont: Font = .footnote.weight(.semibold)
    ) -> some View {
        if !showDiffsOnly || !allSame {
            HStack(spacing: 10) {
                Text(title)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(slateBlue)
                    .frame(width: 70, alignment: .leading)

                ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                    Text(label)
                        .font(highlights.contains(index) ? highlightFont : .footnote.weight(.semibold))
                        .foregroundStyle(
                            highlights.contains(index) ? bestForeground : slateBlue
                        )
                        .frame(minWidth: columnWidth, maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .cellBackground(highlighted: highlights.contains(index))
                }
            }
        }
    }

    /// Row with custom cell content.
    @ViewBuilder
    func conditionalRowContent<Content: View>(
        title: String,
        allSame: Bool,
        @ViewBuilder content: () -> Content
    ) -> some View {
        if !showDiffsOnly || !allSame {
            HStack(spacing: 10) {
                Text(title)
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(slateBlue)
                    .frame(width: 70, alignment: .leading)

                content()
            }
        }
    }
}

// MARK: - Cell Background Modifier

private struct CellBackgroundModifier: ViewModifier {
    let highlighted: Bool

    func body(content: Content) -> some View {
        content
            .background(
                highlighted
                    ? bestTint
                    : paperWhite.opacity(0.86),
                in: RoundedRectangle(cornerRadius: CornerRadius.small, style: .continuous)
            )
            .overlay(
                RoundedRectangle(cornerRadius: CornerRadius.small, style: .continuous)
                    .stroke(
                        highlighted ? bestBorder : lineSoft,
                        lineWidth: 1
                    )
            )
    }
}

private extension View {
    func cellBackground(highlighted: Bool) -> some View {
        modifier(CellBackgroundModifier(highlighted: highlighted))
    }
}

// MARK: - Highlight Helpers

private extension CompareMatrixView {
    func highestHighlights<T: Comparable & Numeric>(_ values: [T]) -> Set<Int> {
        guard let highest = values.max(), highest > 0 else { return [] }
        let indices = Set(values.enumerated().compactMap { idx, val in val == highest ? idx : nil })
        return indices.count == values.count ? [] : indices
    }

    /// Highlight indexes with the lowest value (lower is better). Zeros excluded.
    func lowestHighlights(_ values: [Double]) -> Set<Int> {
        let positives = values.enumerated().filter { $0.element > 0 }
        guard let lowest = positives.min(by: { $0.element < $1.element })?.element else { return [] }
        let indices = Set(positives.compactMap { idx, val in val == lowest ? idx : nil })
        return indices.count == positives.count ? [] : indices
    }

    /// Highlight indexes where Bool is true. No highlight if all same.
    func boolHighlights(_ values: [Bool]) -> Set<Int> {
        guard Set(values).count > 1 else { return [] }
        return Set(values.enumerated().compactMap { idx, val in val ? idx : nil })
    }

    /// Highlight only `.direct` meal type. No highlight if all same.
    func mealHighlights(_ values: [MealType]) -> Set<Int> {
        guard Set(values).count > 1 else { return [] }
        return Set(values.enumerated().compactMap { idx, val in val == .direct ? idx : nil })
    }

    func vacancyHighlights(_ values: [Int]) -> Set<Int> {
        guard values.contains(where: { $0 > 0 }), !values.allSatisfy({ $0 > 0 }) else { return [] }
        return Set(values.enumerated().compactMap { idx, val in val > 0 ? idx : nil })
    }
}
