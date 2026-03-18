import Models
import Services
import SwiftUI

public struct CompareView: View {
    private let items: [Kindergarten]
    private let onRemove: (Kindergarten) -> Void
    private let deepLinkBuilder: DeepLinkBuilder

    public init(
        items: [Kindergarten] = [],
        onRemove: @escaping (Kindergarten) -> Void = { _ in },
        deepLinkBuilder: DeepLinkBuilder = DeepLinkBuilder()
    ) {
        self.items = items
        self.onRemove = onRemove
        self.deepLinkBuilder = deepLinkBuilder
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("최대 3곳 비교")
                        .font(.largeTitle.bold())

                    if items.isEmpty {
                        EmptyCompareState()
                    } else {
                        Text(summaryLine)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(items) { item in
                                    CompareHeaderCard(item: item, onRemove: { onRemove(item) })
                                }
                            }
                        }

                        VStack(spacing: 12) {
                            CompareMetricRow(title: "1인당 면적", values: items.map { String(format: "%.1f㎡", $0.areaPerChild) })
                            CompareMetricRow(title: "정원", values: items.map { "\($0.capacity)명" })
                            CompareMetricRow(title: "셔틀", values: items.map { $0.hasBus ? "\($0.busCount)대" : "없음" })
                            CompareMetricRow(title: "방과후", values: items.map { $0.hasAfterSchool ? "운영" : "미운영" })
                        }
                    }

                    if let shareURL {
                        ShareLink(
                            item: shareURL,
                            subject: Text("우리동네 유치원 비교"),
                            message: Text(shareSummary)
                        ) {
                            Label("비교 결과 공유", systemImage: "square.and.arrow.up.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .accessibilityIdentifier("compare.shareButton")
                        .buttonStyle(.borderedProminent)
                        .tint(leafGreen)
                    } else {
                        Label("비교 결과 공유", systemImage: "square.and.arrow.up.fill")
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.gray.opacity(0.16), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(20)
            }
            .background(Color(red: 0.97, green: 0.96, blue: 0.94))
            .navigationTitle("비교")
        }
    }

    private var summaryLine: String {
        switch items.count {
        case 1:
            return "선택한 1곳의 핵심 지표입니다. 검색 화면에서 최대 2곳까지 더 추가할 수 있습니다."
        case 2:
            return "선택한 2곳의 핵심 지표를 나란히 비교합니다."
        default:
            return "선택한 \(items.count)곳의 핵심 지표를 나란히 비교합니다."
        }
    }

    private var shareURL: URL? {
        deepLinkBuilder.compareURL(ids: items.map(\.kindercode))
    }

    private var shareSummary: String {
        let lines = items.map { item in
            "\(item.name) · \(item.address) · 정원 \(item.capacity)명 · 1인당 면적 \(String(format: "%.1f㎡", item.areaPerChild))"
        }

        return ([
            "우리동네 유치원 비교",
            lines.joined(separator: "\n"),
            shareURL?.absoluteString ?? ""
        ])
        .filter { !$0.isEmpty }
        .joined(separator: "\n\n")
    }
}

private struct EmptyCompareState: View {
    var body: some View {
        VStack(spacing: 14) {
            Image(systemName: "square.split.2x2")
                .font(.system(size: 36))
                .foregroundStyle(leafGreen)
            Text("아직 비교할 유치원을 선택하지 않았습니다.")
                .font(.headline.weight(.semibold))
            Text("탐색 화면이나 상세 시트에서 비교 목록에 추가하면 여기서 바로 비교할 수 있습니다.")
                .font(.subheadline)
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 48)
        .padding(.horizontal, 20)
        .background(.white, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .accessibilityIdentifier("compare.emptyState")
    }
}

private struct CompareHeaderCard: View {
    let item: Kindergarten
    let onRemove: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                Text(item.type.label)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(leafGreen)
                Spacer()
                Button(action: onRemove) {
                    Image(systemName: "minus.circle.fill")
                        .font(.title3)
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
            }

            Text(item.name)
                .font(.headline)
            Text(item.address)
                .font(.footnote)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            if item.distance >= 0 {
                Text(String(format: "%.1fkm", item.distance))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(18)
        .frame(width: 220, alignment: .leading)
        .background(.white, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
        .accessibilityIdentifier("compare.card.\(item.kindercode)")
    }
}

private struct CompareMetricRow: View {
    let title: String
    let values: [String]

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.semibold))
            HStack(spacing: 10) {
                ForEach(Array(values.enumerated()), id: \.offset) { _, value in
                    Text(value)
                        .font(.footnote.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.white, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
                }
            }
        }
    }
}

private let leafGreen = Color(red: 0.31, green: 0.68, blue: 0.43)
