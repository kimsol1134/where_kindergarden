import Services
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct MoreView: View {
    @ObservedObject private var model: NativeAppModel
    @AppStorage("native.debugMode") private var isDebugModeActive = false

    public init(model: NativeAppModel) {
        self.model = model
    }

    @MainActor public init() {
        self.model = .preview()
    }

    private var configuration: NativeAppConfiguration {
        model.configuration
    }

    private var appVersionText: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "버전 \(version) (\(build))"
    }

    private var reviewVersionText: String {
        model.reviewsData?.version ?? "로딩 전"
    }

    private var locationPermissionStatus: String {
        if model.currentDeviceLocation != nil {
            return "허용됨"
        } else if model.locationError != nil {
            return "거부됨"
        } else {
            return "미요청"
        }
    }

    public var body: some View {
        NavigationStack {
            List {
                Section("앱 상태") {
                    LabeledContent("위치 권한", value: locationPermissionStatus)
                    #if canImport(UIKit)
                    if let _ = model.locationError {
                        Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                            Label("설정에서 위치 권한 변경", systemImage: "gear")
                                .font(.subheadline)
                        }
                    }
                    #endif
                    LabeledContent("데이터 갱신일", value: reviewVersionText)
                }

                Section("서비스") {
                    ExternalRow(
                        title: "서비스 소개",
                        subtitle: "우리동네 유치원이 어떤 데이터를 바탕으로 동작하는지 확인합니다.",
                        systemImage: "text.book.closed",
                        url: URL(string: "https://where-kindergarten.com/about")!
                    )
                    ExternalRow(
                        title: "개인정보처리방침",
                        subtitle: "위치 정보와 앱 데이터 처리 기준을 확인합니다.",
                        systemImage: "lock.shield",
                        url: URL(string: "https://where-kindergarten.com/privacy")!
                    )
                    ExternalRow(
                        title: "앱 사용 가이드",
                        subtitle: "자주 묻는 질문과 기본 사용 흐름을 엽니다.",
                        systemImage: "questionmark.circle",
                        url: URL(string: "https://where-kindergarten.com/#faq")!
                    )
                }

                Section("지원") {
                    ExternalRow(
                        title: "피드백 보내기",
                        subtitle: "오류 제보, 데이터 제안, 제휴 문의를 메일로 보냅니다.",
                        systemImage: "paperplane",
                        url: URL(string: "mailto:support@where-kindergarten.com")!
                    )
                    ExternalRow(
                        title: "공식 데이터 출처",
                        subtitle: "교육부 유치원 알리미 사이트를 엽니다.",
                        systemImage: "building.columns",
                        url: URL(string: "https://e-childschoolinfo.moe.go.kr")!
                    )
                }

                Section("앱 정보") {
                    ExternalRow(
                        title: "App Store 페이지",
                        subtitle: "현재 앱스토어 등록 페이지를 엽니다.",
                        systemImage: "apple.logo",
                        url: URL(string: "https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645")!
                    )

                    LabeledContent("앱 버전", value: appVersionText)
                        .font(.footnote)
                        .onTapGesture(count: 5) {
                            isDebugModeActive.toggle()
                        }
                }

                if isDebugModeActive {
                    Section("디버그") {
                        LabeledContent("검색 기준 위치", value: model.locationLabel)
                        LabeledContent("실제 기기 위치", value: {
                            if let loc = model.currentDeviceLocation {
                                return String(format: "%.4f, %.4f", loc.lat, loc.lng)
                            }
                            return "아직 요청되지 않음"
                        }())
                        LabeledContent("Kakao 지도 키", value: configuration.hasKakaoMapKey ? "설정됨" : "키 없음")
                        LabeledContent("Kakao Local 키", value: configuration.hasKakaoRESTAPIKey ? "설정됨" : "키 없음")
                        LabeledContent("딥링크", value: "wherekindergarten://compare?ids=...")
                        LabeledContent("찜한 유치원", value: "\(model.favorites.count)곳")
                        LabeledContent("최근 검색", value: "\(model.recentSearches.count)건")
                        LabeledContent("비교 목록", value: "\(model.compareSelection.ids.count)곳")
                    }
                }
            }
            .navigationTitle("더보기")
        }
    }
}

private struct ExternalRow: View {
    let title: String
    let subtitle: String
    let systemImage: String
    let url: URL

    var body: some View {
        Link(destination: url) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.title3)
                    .foregroundStyle(leafGreen)
                    .frame(width: 24)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.primary)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}
