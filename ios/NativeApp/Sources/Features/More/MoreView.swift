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
            ZStack {
                NativeScreenBackground(topTintOpacity: 0.16)

                List {
                    Section {
                        NativeScreenHeader(
                            eyebrow: "신뢰센터",
                            title: "우리동네 유치원을 믿는 기준",
                            subtitle: "데이터, 위치, 광고, 접근성, 문의 기준을 한 화면에서 확인하세요."
                        ) {
                            Link(destination: URL(string: "mailto:support@where-kindergarten.com")!) {
                                Text("문의")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(inkBlack)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(jadeGreen.opacity(0.20), in: Capsule())
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 12, leading: 0, bottom: 10, trailing: 0))
                        .listRowBackground(Color.clear)

                        TrustHeroCard(
                            title: "공식 교육부 데이터 기반",
                            message: "전국 유치원 정보를 교육부 기준 데이터로 표시하고, 현재 갱신일 \(reviewVersionText)과 함께 판단 근거를 읽을 수 있게 정리합니다.",
                            meta: "데이터 갱신일 \(reviewVersionText) · 위치 권한 \(locationPermissionStatus)"
                        )
                        TrustCard(
                            title: "후기 출처를 분리해 보여줌",
                            message: "블로그, 카페 등 출처와 날짜를 분리해 보여 부모가 직접 신뢰도를 판단할 수 있게 합니다.",
                            tone: .sun
                        )
                        TrustCard(
                            title: "위치 정보는 저장하지 않음",
                            message: "검색 기준 위치만 사용하고, 현재 기기 위치는 권한 상태에 따라 일시적으로만 활용합니다.",
                            tone: .slate
                        )
                        TrustCard(
                            title: "광고와 탐색 데이터 분리",
                            message: "광고 노출과 유치원 비교 데이터는 분리해 보여주며, 판단 근거는 검색 결과 카드 안에서 따로 읽을 수 있습니다.",
                            tone: .sun
                        )
                        TrustCard(
                            title: "접근성 기준 포함",
                            message: "큰 텍스트, 충분한 대비, 명확한 버튼 구조를 전제로 화면을 설계했습니다.",
                            tone: .slate
                        )
                        TrustCard(
                            title: "문의와 출처를 바로 확인",
                            message: "문의 메일과 공식 데이터 출처 링크를 같은 탭에서 바로 열 수 있습니다.",
                            tone: .jade
                        )
                    }

                    Section {
                        StatRow(title: "위치 권한", value: locationPermissionStatus)
                        StatRow(title: "데이터 갱신일", value: reviewVersionText)
                        #if canImport(UIKit)
                        if let _ = model.locationError {
                            Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                                HStack {
                                    Label("설정에서 위치 권한 변경", systemImage: "gear")
                                    Spacer()
                                }
                                .padding(.vertical, 4)
                            }
                            .buttonStyle(.plain)
                        }
                        #endif
                    } header: {
                        MoreSectionHeader(title: "앱 상태")
                    }

                    Section {
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
                    } header: {
                        MoreSectionHeader(title: "서비스")
                    }

                    Section {
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
                    } header: {
                        MoreSectionHeader(title: "지원")
                    }

                    Section {
                        ExternalRow(
                            title: "App Store 페이지",
                            subtitle: "현재 앱스토어 등록 페이지를 엽니다.",
                            systemImage: "apple.logo",
                            url: URL(string: "https://apps.apple.com/us/app/%EC%9C%A0%EC%B9%98%EC%9B%90-%EC%95%8C%EB%A6%AC%EB%AF%B8-%EC%9A%B0%EB%A6%AC%EB%8F%99%EB%84%A4-%EC%9C%A0%EC%B9%98%EC%9B%90/id6758149645")!
                        )

                        StatRow(title: "앱 버전", value: appVersionText)
                            .onTapGesture(count: 5) {
                                isDebugModeActive.toggle()
                            }
                    } header: {
                        MoreSectionHeader(title: "앱 정보")
                    }

                    if isDebugModeActive {
                        Section {
                            StatRow(title: "검색 기준 위치", value: model.locationLabel)
                            StatRow(title: "실제 기기 위치", value: {
                                if let loc = model.currentDeviceLocation {
                                    return String(format: "%.4f, %.4f", loc.lat, loc.lng)
                                }
                                return "아직 요청되지 않음"
                            }())
                            StatRow(title: "Kakao 지도 키", value: configuration.hasKakaoMapKey ? "설정됨" : "키 없음")
                            StatRow(title: "Kakao Local 키", value: configuration.hasKakaoRESTAPIKey ? "설정됨" : "키 없음")
                            StatRow(title: "딥링크", value: "wherekindergarten://compare?ids=...")
                            StatRow(title: "찜한 기관", value: "\(model.favorites.count)곳")
                            StatRow(title: "최근 검색", value: "\(model.recentSearches.count)건")
                            StatRow(title: "비교 목록", value: "\(model.compareSelection.ids.count)곳")
                        } header: {
                            MoreSectionHeader(title: "디버그")
                        }
                    }
                }
                .listStyle(.plain)
                .scrollContentBackground(.hidden)
                .background(Color.clear)
            }
        }
    }
}

private struct MoreSectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.headline.weight(.bold))
            .foregroundStyle(inkBlack)
            .textCase(nil)
    }
}

private struct TrustCard: View {
    let title: String
    let message: String
    let tone: NativeBadge.Tone

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            NativeBadge(title, tone: tone)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(18)
        .solidPanel(cornerRadius: 28, tint: paperWhite.opacity(0.94))
        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
        .listRowBackground(Color.clear)
    }
}

private struct TrustHeroCard: View {
    let title: String
    let message: String
    let meta: String

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            NativeBadge("핵심 기준", tone: .slate)
            Text(title)
                .font(.title3.weight(.bold))
                .foregroundStyle(inkBlack)
            Text(message)
                .font(.subheadline)
                .foregroundStyle(slateBlue)
                .fixedSize(horizontal: false, vertical: true)
            Text(meta)
                .font(.caption.weight(.semibold))
                .foregroundStyle(jadeDeep)
        }
        .padding(22)
        .glassPanel(cornerRadius: 30)
        .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 8, trailing: 0))
        .listRowBackground(Color.clear)
    }
}

private struct StatRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(inkBlack)
            Spacer(minLength: 12)
            Text(value)
                .font(.footnote)
                .foregroundStyle(slateBlue)
                .multilineTextAlignment(.trailing)
        }
        .padding(.vertical, 4)
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
                ZStack {
                    Circle()
                        .fill(jadeGreen.opacity(0.16))
                        .frame(width: 36, height: 36)
                    Image(systemName: systemImage)
                        .font(.callout.weight(.bold))
                        .foregroundStyle(jadeDeep)
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(inkBlack)
                    Text(subtitle)
                        .font(.caption)
                        .foregroundStyle(slateBlue)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
                Image(systemName: "arrow.up.right.square")
                    .foregroundStyle(slateSoft)
            }
            .padding(16)
            .solidPanel(cornerRadius: 24, tint: paperWhite.opacity(0.94))
        }
        .buttonStyle(.plain)
    }
}
