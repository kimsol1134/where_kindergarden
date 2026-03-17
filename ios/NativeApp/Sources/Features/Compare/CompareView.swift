import Models
import SwiftUI

public struct CompareView: View {
    private let items: [Kindergarten]

    public init(items: [Kindergarten] = NativePreviewFixtures.kindergartens.prefix(3).map { Kindergarten(raw: $0, distance: 0.4) }) {
        self.items = items
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("최대 3곳 비교")
                        .font(.largeTitle.bold())

                    Text("iPhone에서는 카드형 비교 헤더와 핵심 지표만 먼저 노출하고, 공유는 시스템 시트로 보냅니다.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 14) {
                            ForEach(items) { item in
                                VStack(alignment: .leading, spacing: 8) {
                                    Text(item.type.label)
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(leafGreen)
                                    Text(item.name)
                                        .font(.headline)
                                    Text(String(format: "%.1fkm", item.distance))
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                                .padding(18)
                                .frame(width: 180, alignment: .leading)
                                .background(.white, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
                            }
                        }
                    }

                    VStack(spacing: 12) {
                        CompareMetricRow(title: "1인당 면적", values: items.map { String(format: "%.1f㎡", $0.areaPerChild) })
                        CompareMetricRow(title: "정원", values: items.map { "\($0.capacity)명" })
                        CompareMetricRow(title: "셔틀", values: items.map { $0.hasBus ? "\($0.busCount)대" : "없음" })
                        CompareMetricRow(title: "방과후", values: items.map { $0.hasAfterSchool ? "운영" : "미운영" })
                    }

                    Button {
                    } label: {
                        Label("비교 결과 공유", systemImage: "square.and.arrow.up.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(leafGreen)
                }
                .padding(20)
            }
            .background(Color(red: 0.97, green: 0.96, blue: 0.94))
            .navigationTitle("비교")
        }
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
