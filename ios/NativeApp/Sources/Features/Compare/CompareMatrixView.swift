import Models
import SwiftUI

// MARK: - Public Interface

struct CompareMatrixView: View {
    let items: [Kindergarten]
    let reviewCounts: [Int]
    let vacancyCounts: [Int]

    @State private var showDiffsOnly = false
    @State private var showMore = false

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

            nameHeader

            // 핵심 항목 (사용자 지정 순서)
            reviewCard
            capacityCard
            teacherRatioCard
            busCard
            areaCard

            // 더보기 섹션
            if showMore {
                mealCard
                afterSchoolCard
                vacancyCard
                playgroundCard
                cctvCard
                establishCard
                phoneCard
            }

            Button {
                withAnimation(.spring(duration: 0.3)) {
                    showMore.toggle()
                }
            } label: {
                HStack(spacing: 6) {
                    Text(showMore ? "접기" : "상세 비교 더보기")
                        .font(.footnote.weight(.semibold))
                    Image(systemName: showMore ? "chevron.up" : "chevron.down")
                        .font(.caption.weight(.semibold))
                }
                .foregroundStyle(jadeDeep)
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .frame(maxWidth: .infinity)
                .background(jadeGreen.opacity(0.10), in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
            }
            .buttonStyle(.plain)

            legendView
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("비교표. \(items.count)곳 비교")
    }
}

// MARK: - Highlight System

private let bestTint = Color.blue.opacity(0.10)
private let bestBorder = Color.blue.opacity(0.20)
private let bestForeground = Color(red: 0.18, green: 0.38, blue: 0.68)

// MARK: - Name Header

private extension CompareMatrixView {
    var nameHeader: some View {
        HStack(spacing: 8) {
            ForEach(Array(items.enumerated()), id: \.element.id) { _, item in
                Text(shortHeader(for: item.name))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(inkBlack)
                    .frame(maxWidth: .infinity)
                    .lineLimit(1)
            }
        }
        .padding(.vertical, 8)
    }

    func shortHeader(for name: String) -> String {
        name.replacingOccurrences(of: "유치원", with: "")
            .replacingOccurrences(of: "어린이집", with: "")
    }
}

// MARK: - Metric Card Components

private struct CompareMetricCard<Content: View>: View {
    let title: String
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.footnote.weight(.bold))
                .foregroundStyle(slateBlue)
            content
        }
        .padding(14)
        .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.94))
    }
}

private struct MetricCell: View {
    let value: String
    let highlighted: Bool

    var body: some View {
        Text(value)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(highlighted ? bestForeground : slateBlue)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .cellBackground(highlighted: highlighted)
    }
}

// MARK: - Core Cards (핵심 항목)

private extension CompareMatrixView {
    // 1. 후기
    @ViewBuilder
    var reviewCard: some View {
        let highlights = highestHighlights(reviewCounts)
        let labels = reviewCounts.map { "\($0)건" }
        let allSame = Set(reviewCounts).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "후기") {
                HStack(spacing: 8) {
                    ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                        MetricCell(value: label, highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    // 2. 현원/정원
    @ViewBuilder
    var capacityCard: some View {
        let allSame = Set(items.map { "\($0.capacity)/\($0.currentCount)" }).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "현원 / 정원") {
                HStack(spacing: 8) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { _, item in
                        let fillRate = item.capacity > 0
                            ? Double(item.currentCount) / Double(item.capacity)
                            : 0
                        let barColor: Color = fillRate >= 0.9 ? amberOrange : jadeGreen

                        VStack(spacing: 4) {
                            Text("\(item.currentCount)/\(item.capacity)명")
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
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .cellBackground(highlighted: false)
                    }
                }
            }
        }
    }

    // 3. 교사비율
    @ViewBuilder
    var teacherRatioCard: some View {
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

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "교사 대 원아 비율") {
                HStack(spacing: 8) {
                    ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                        MetricCell(value: label, highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    // 4. 셔틀
    @ViewBuilder
    var busCard: some View {
        let busCounts = items.map { $0.hasBus ? $0.busCount : 0 }
        let highlights = highestHighlights(busCounts)
        let allSame = Set(items.map { $0.hasBus }).count <= 1
            && Set(busCounts).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "셔틀") {
                HStack(spacing: 8) {
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
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .cellBackground(highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    // 5. 1인당 면적
    @ViewBuilder
    var areaCard: some View {
        let areas = items.map(\.areaPerChild)
        let labels = areas.map { String(format: "%.1f\u{33A1}", $0) }
        let highlights = highestHighlights(areas)
        let allSame = Set(labels).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "1인당 면적") {
                HStack(spacing: 8) {
                    ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                        MetricCell(value: label, highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }
}

// MARK: - More Cards (더보기 항목)

private extension CompareMatrixView {
    @ViewBuilder
    var mealCard: some View {
        let mealTypes = items.map(\.mealType)
        let labels = items.map { mealLabel(for: $0.mealType) }
        let highlights = mealHighlights(mealTypes)
        let allSame = Set(mealTypes.map(\.rawValue)).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "급식") {
                HStack(spacing: 8) {
                    ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                        MetricCell(value: label, highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    func mealLabel(for type: MealType) -> String {
        switch type {
        case .direct: return "직영"
        case .outsourced: return "위탁"
        case .none: return "없음"
        }
    }

    @ViewBuilder
    var afterSchoolCard: some View {
        let values = items.map(\.hasAfterSchool)
        let highlights = boolHighlights(values)
        let allSame = Set(values).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "방과후") {
                HStack(spacing: 8) {
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
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .cellBackground(highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    @ViewBuilder
    var vacancyCard: some View {
        let labels: [String] = vacancyCounts.map { count in
            count > 0 ? "빈자리 \(count)명" : "없음"
        }
        let highlights = vacancyHighlights(vacancyCounts)
        let allSame = Set(vacancyCounts).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "결원") {
                HStack(spacing: 8) {
                    ForEach(Array(labels.enumerated()), id: \.offset) { index, label in
                        MetricCell(value: label, highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    @ViewBuilder
    var playgroundCard: some View {
        let values = items.map(\.hasPlayground)
        let highlights = boolHighlights(values)
        let allSame = Set(values).count <= 1
            && Set(items.map { Int($0.outdoorPlaygroundArea) }).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "놀이터") {
                HStack(spacing: 8) {
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
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .cellBackground(highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    @ViewBuilder
    var cctvCard: some View {
        let counts = items.map(\.cctvCount)
        let highlights = highestHighlights(counts)
        let allSame = Set(counts).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "CCTV") {
                HStack(spacing: 8) {
                    ForEach(Array(counts.enumerated()), id: \.offset) { index, count in
                        MetricCell(value: "\(count)대", highlighted: highlights.contains(index))
                    }
                }
            }
        }
    }

    @ViewBuilder
    var establishCard: some View {
        let years = items.map { String($0.establishDate.prefix(4)) + "년" }
        let allSame = Set(years).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "설립") {
                HStack(spacing: 8) {
                    ForEach(Array(years.enumerated()), id: \.offset) { _, year in
                        MetricCell(value: year, highlighted: false)
                    }
                }
            }
        }
    }

    @ViewBuilder
    var phoneCard: some View {
        let phones = items.map(\.phone)
        let allSame = Set(phones.map { $0 ?? "" }).count <= 1

        if !showDiffsOnly || !allSame {
            CompareMetricCard(title: "전화") {
                HStack(spacing: 8) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { _, item in
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
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .cellBackground(highlighted: false)
                    }
                }
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

    func lowestHighlights(_ values: [Double]) -> Set<Int> {
        let positives = values.enumerated().filter { $0.element > 0 }
        guard let lowest = positives.min(by: { $0.element < $1.element })?.element else { return [] }
        let indices = Set(positives.compactMap { idx, val in val == lowest ? idx : nil })
        return indices.count == positives.count ? [] : indices
    }

    func boolHighlights(_ values: [Bool]) -> Set<Int> {
        guard Set(values).count > 1 else { return [] }
        return Set(values.enumerated().compactMap { idx, val in val ? idx : nil })
    }

    func mealHighlights(_ values: [MealType]) -> Set<Int> {
        guard Set(values).count > 1 else { return [] }
        return Set(values.enumerated().compactMap { idx, val in val == .direct ? idx : nil })
    }

    func vacancyHighlights(_ values: [Int]) -> Set<Int> {
        guard values.contains(where: { $0 > 0 }), !values.allSatisfy({ $0 > 0 }) else { return [] }
        return Set(values.enumerated().compactMap { idx, val in val > 0 ? idx : nil })
    }
}
