import Services
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct MoreView: View {
    @ObservedObject private var model: NativeAppModel
    #if DEBUG
    @AppStorage("native.debugMode") private var isDebugModeActive = false
    #endif

    public init(model: NativeAppModel) {
        self.model = model
    }

    @MainActor public init() {
        self.model = .preview()
    }

    private var reviewVersionText: String {
        model.reviewsData?.version ?? "확인 중"
    }

    private var appVersionText: String {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
        return "버전 \(version) (\(build))"
    }

    public var body: some View {
        NavigationStack {
            List {
                    Section {
                        NativeScreenHeader(
                            eyebrow: "앱 정보",
                            title: "안내와 문의",
                            subtitle: "도움말과 정책을 한곳에서 확인할 수 있어요."
                        ) {
                            Link(destination: URL(string: "https://apps.apple.com/app/id6758149645?action=write-review")!) {
                                Text("앱스토어 리뷰")
                                    .font(.footnote.weight(.semibold))
                                    .foregroundStyle(inkBlack)
                                    .padding(.horizontal, 14)
                                    .padding(.vertical, 10)
                                    .background(sunYellow.opacity(0.28), in: Capsule())
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 16, leading: 20, bottom: 10, trailing: 20))
                        .listRowBackground(Color.clear)

                        IntroCard(
                            title: "가까운 유치원을 빠르게 찾고, 저장하고, 비교해 보세요.",
                            message: "후기와 기본 정보를 함께 보여드려서 동네 선택이 더 쉬워져요."
                        )

                        ExternalRow(
                            title: "문의하기",
                            subtitle: "불편한 점이나 제안은 메일로 보내주세요.",
                            systemImage: "paperplane",
                            url: URL(string: "mailto:support@where-kindergarten.com")!
                        )
                        ExternalRow(
                            title: "개인정보처리방침",
                            subtitle: "위치와 이용 정보의 사용 범위를 확인해요.",
                            systemImage: "lock.shield",
                            url: URL(string: "https://where-kindergarden.vercel.app/privacy")!
                        )
                        ExternalRow(
                            title: "자주 묻는 질문",
                            subtitle: "기능과 이용 방법을 빠르게 볼 수 있어요.",
                            systemImage: "questionmark.circle",
                            url: URL(string: "https://where-kindergarden.vercel.app/#faq")!
                        )
                    }

                    Section {
                        ExternalRow(
                            title: "앱스토어 보기",
                            subtitle: "최신 버전과 리뷰를 확인해요.",
                            systemImage: "apple.logo",
                            url: URL(string: "https://apps.apple.com/app/id6758149645")!
                        )

                        StatRow(title: "앱 버전", value: appVersionText)
                    } header: {
                        MoreSectionHeader(title: "앱 정보")
                    }

                    Section {
                        StatRow(title: "위치 권한", value: model.locationPermissionStatusText)
                        StatRow(title: "정보 업데이트", value: reviewVersionText)
                        #if canImport(UIKit)
                        if model.shouldShowLocationSettingsCTA, let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                            Link(destination: settingsURL) {
                                HStack(spacing: 12) {
                                    ZStack {
                                        Circle()
                                            .fill(sunYellow.opacity(0.20))
                                            .frame(width: 36, height: 36)
                                        Image(systemName: "gear")
                                            .font(.callout.weight(.bold))
                                            .foregroundStyle(inkBlack)
                                    }
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("위치 권한 설정 열기")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(inkBlack)
                                        Text("위치를 허용하면 근처 유치원을 바로 찾을 수 있어요.")
                                            .font(.caption)
                                            .foregroundStyle(slateBlue)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .foregroundStyle(slateSoft)
                                }
                                .padding(16)
                                .solidPanel(cornerRadius: CornerRadius.medium, tint: sunYellow.opacity(0.08))
                            }
                            .buttonStyle(.plain)
                        }
                        #endif
                    } header: {
                        MoreSectionHeader(title: "앱 상태")
                    }

                    #if DEBUG
                    if isDebugModeActive {
                        Section {
                            StatRow(title: "검색 기준 위치", value: model.locationLabel)
                            StatRow(title: "실제 기기 위치", value: {
                                if let loc = model.currentDeviceLocation {
                                    return String(format: "%.4f, %.4f", loc.lat, loc.lng)
                                }
                                return "아직 요청되지 않음"
                            }())
                            StatRow(title: "Kakao 지도 키", value: model.configuration.hasKakaoMapKey ? "설정됨" : "키 없음")
                            StatRow(title: "Kakao Local 키", value: model.configuration.hasKakaoRESTAPIKey ? "설정됨" : "키 없음")
                            StatRow(title: "딥링크", value: "wherekindergarten://compare?ids=...")
                            StatRow(title: "찜한 기관", value: "\(model.favorites.count)곳")
                            StatRow(title: "최근 검색", value: "\(model.recentSearches.count)건")
                            StatRow(title: "비교 목록", value: "\(model.compareSelection.ids.count)곳")
                        } header: {
                            MoreSectionHeader(title: "디버그")
                        }
                    }
                    #endif
                }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background { NativeScreenBackground(topTintOpacity: 0.16) }
            .task {
                model.refreshLocationPermissionState()
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

private struct IntroCard: View {
    let title: String
    let message: String

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
        }
        .padding(18)
        .glassPanel(cornerRadius: CornerRadius.large)
        .listRowInsets(EdgeInsets(top: 4, leading: 20, bottom: 8, trailing: 20))
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
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 4)
        .accessibilityElement(children: .combine)
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
                Image(systemName: "chevron.right")
                    .foregroundStyle(slateSoft)
            }
            .padding(16)
            .solidPanel(cornerRadius: CornerRadius.medium, tint: paperWhite.opacity(0.94))
        }
        .buttonStyle(PressableCardStyle())
        .accessibilityElement(children: .combine)
    }
}
