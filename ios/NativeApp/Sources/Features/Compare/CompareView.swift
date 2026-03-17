import Models
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
                    Text("최대 3곳 비교")
                        .font(.largeTitle.bold())

                    Text("커스텀 스킴과 universal link 모두 동일한 비교 상태를 이 화면으로 복원합니다.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if items.isEmpty {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("아직 비교할 기관이 없습니다.")
                                .font(.headline)
                            Text("검색 탭에서 최대 3곳을 고르면 이 화면과 딥링크가 같은 상태를 공유합니다.")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        .padding(20)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(.white, in: RoundedRectangle(cornerRadius: 26, style: .continuous))
                    } else {
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
                            CompareMetricRow(title: "후기 수", values: items.map { "\(model.reviews(for: $0.kindercode).count)건" })
                        }

                        if let shareURL = model.compareShareURL() {
                            ShareLink(item: shareURL) {
                                Label("비교 링크 공유", systemImage: "square.and.arrow.up.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(leafGreen)
                        }
                    }
                }
                .padding(20)
            }
            .background(mistWhite)
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
