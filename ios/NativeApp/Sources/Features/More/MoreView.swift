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
        model.reviewsData?.version ?? "확인 중"
    }

    private var locationPermissionStatus: String {
        if model.currentDeviceLocation != nil {
            return "켜짐"
        } else if model.locationError != nil {
            return "꺼짐"
        } else {
            return "확인 전"
        }
    }

    public var body: some View {
        NavigationStack {
            ZStack {
                NativeScreenBackground(topTintOpacity: 0.16)

                List {
                    Section {
                        NativeScreenHeader(
                            eyebrow: "앱 정보",
                            title: "안내와 문의",
                            subtitle: "앱 소개, 개인정보처리방침, 문의처를 확인할 수 있어요."
                        ) {
                            Link(destination: URL(string: "mailto:support@where-kindergarten.com")!) {
                                Text("문의하기")
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
                            title: "주변 유치원을 쉽게 찾고 비교해요",
                            message: "동네별로 유치원을 찾고, 저장하고, 비교까지 한 번에 할 수 있어요.",
                            meta: "최근 업데이트 \(reviewVersionText)"
                        )
                        TrustCard(
                            title: "후기는 참고용으로 볼 수 있어요",
                            message: "블로그나 카페 후기를 모아 보여드려서 분위기를 가늠하는 데 도움을 드려요.",
                            tone: .sun
                        )
                        TrustCard(
                            title: "위치는 필요한 때만 사용해요",
                            message: "내 위치로 찾을 때만 활용하고, 저장한 동네는 언제든 다시 불러올 수 있어요.",
                            tone: .slate
                        )
                        TrustCard(
                            title: "궁금한 점은 바로 문의해 주세요",
                            message: "불편한 점이나 제안하고 싶은 내용을 메일로 편하게 보내실 수 있어요.",
                            tone: .jade
                        )
                    }

                    Section {
                        StatRow(title: "위치 권한", value: locationPermissionStatus)
                        StatRow(title: "정보 업데이트", value: reviewVersionText)
                        #if canImport(UIKit)
                        if let _ = model.locationError {
                            Link(destination: URL(string: UIApplication.openSettingsURLString)!) {
                                HStack {
                                    Label("위치 권한 설정 열기", systemImage: "gear")
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
                            title: "앱 소개",
                            subtitle: "앱에서 할 수 있는 일을 소개합니다.",
                            systemImage: "text.book.closed",
                            url: URL(string: "https://where-kindergarden.vercel.app/about")!
                        )
                        ExternalRow(
                            title: "개인정보처리방침",
                            subtitle: "위치와 이용 정보가 어떻게 쓰이는지 확인합니다.",
                            systemImage: "lock.shield",
                            url: URL(string: "https://where-kindergarden.vercel.app/privacy")!
                        )
                        ExternalRow(
                            title: "자주 묻는 질문",
                            subtitle: "많이 묻는 내용을 먼저 확인해 보세요.",
                            systemImage: "questionmark.circle",
                            url: URL(string: "https://where-kindergarden.vercel.app/#faq")!
                        )
                    } header: {
                        MoreSectionHeader(title: "서비스")
                    }

                    Section {
                        ExternalRow(
                            title: "문의하기",
                            subtitle: "불편한 점이나 제안할 내용을 보내주세요.",
                            systemImage: "paperplane",
                            url: URL(string: "mailto:support@where-kindergarten.com")!
                        )
                        ExternalRow(
                            title: "유치원 알리미",
                            subtitle: "기본 정보 출처를 확인합니다.",
                            systemImage: "building.columns",
                            url: URL(string: "https://e-childschoolinfo.moe.go.kr")!
                        )
                    } header: {
                        MoreSectionHeader(title: "지원")
                    }

                    Section {
                        ExternalRow(
                            title: "앱스토어 보기",
                            subtitle: "앱스토어 페이지를 엽니다.",
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
            NativeBadge("한눈에 보기", tone: .slate)
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
