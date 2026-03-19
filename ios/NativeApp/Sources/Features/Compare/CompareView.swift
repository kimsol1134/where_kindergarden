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
                    Text("최대 3곳 비교")
                        .font(.largeTitle.bold())

                    if items.isEmpty {
                        EmptyStateView(
                            icon: "square.split.2x2",
                            title: "비교할 유치원이 없어요",
                            message: "검색 화면에서 비교 목록에 담아두면 여기에서 바로 비교할 수 있어요.",
                            ctaLabel: "유치원 검색하기"
                        ) {
                            model.selectedTab = .search
                        }
                        .accessibilityIdentifier("compare.emptyState")
                    } else {
                        Text(summaryLine)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 14) {
                                ForEach(items) { item in
                                    CompareHeaderCard(item: item) {
                                        model.toggleCompare(for: item)
                                    }
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
                    }

                    if let shareURL = model.compareShareURL() {
                        #if canImport(KakaoSDKShare)
                        if KakaoShareService.isKakaoTalkAvailable {
                            Button {
                                KakaoShareService.shareCompare(
                                    names: items.map(\.name),
                                    shareURL: shareURL
                                )
                            } label: {
                                Label("카카오톡으로 공유", systemImage: "message.fill")
                                    .frame(maxWidth: .infinity)
                            }
                            .accessibilityIdentifier("compare.kakaoShareButton")
                            .buttonStyle(.borderedProminent)
                            .tint(kakaoYellow)
                            .foregroundStyle(.black)
                        }
                        #endif

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

                    #if canImport(GoogleMobileAds)
                    NativeAdBanner(adUnitID: model.configuration.adMobBannerUnitID)
                        .padding(.top, 8)
                    #endif
                }
                .padding(20)
            }
            .background(mistWhite)
            .navigationTitle("비교 목록")
        }
    }

    private var summaryLine: String {
        switch items.count {
        case 1:
            return "선택한 1곳의 핵심 정보를 보여드려요. 비교 목록에 1곳 더 담으면 나란히 비교할 수 있어요."
        case 2:
            return "선택한 2곳 유치원의 핵심 정보를 나란히 비교해요."
        default:
            return "선택한 \(items.count)곳 유치원의 핵심 정보를 나란히 비교해요."
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
