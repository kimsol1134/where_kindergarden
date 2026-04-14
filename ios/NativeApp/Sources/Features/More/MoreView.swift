import Services
import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

public struct MoreView: View {
    var viewModel: SearchViewModel
    #if DEBUG
    @AppStorage("native.debugMode") private var isDebugModeActive = false
    #endif

    public init(viewModel: SearchViewModel) {
        self.viewModel = viewModel
    }

    private var reviewVersionText: String {
        viewModel.reviewsData?.version ?? "확인 중"
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
                    SettingsRow(
                        title: "문의하기",
                        systemImage: "paperplane",
                        tint: jadeGreen,
                        url: URL(string: "mailto:kimsol1134@naver.com")!
                    )
                    SettingsRow(
                        title: "자주 묻는 질문",
                        systemImage: "questionmark.circle",
                        tint: sunYellow,
                        url: URL(string: "https://where-kindergarden.vercel.app/#faq")!
                    )
                    SettingsRow(
                        title: "개인정보처리방침",
                        systemImage: "lock.shield",
                        tint: slateBlue,
                        url: URL(string: "https://where-kindergarden.vercel.app/privacy")!
                    )
                } header: {
                    MoreSectionHeader(title: "지원")
                }

                Section {
                    SettingsRow(
                        title: "앱스토어 보기",
                        systemImage: "apple.logo",
                        tint: inkBlack,
                        url: URL(string: "itms-apps://apps.apple.com/app/id6758149645")!
                    )
                    StatRow(title: "앱 버전", value: appVersionText)
                    StatRow(title: "위치 권한", value: viewModel.locationPermissionStatusText)
                    #if canImport(UIKit)
                    if viewModel.shouldShowLocationSettingsCTA, let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                        SettingsRow(
                            title: "위치 권한 설정 열기",
                            systemImage: "location.slash",
                            tint: amberOrange,
                            url: settingsURL
                        )
                    }
                    #endif
                    StatRow(title: "데이터 버전", value: reviewVersionText)
                } header: {
                    MoreSectionHeader(title: "정보")
                }

                Section {
                    Link(destination: URL(string: "itms-apps://apps.apple.com/app/id6758149645?action=write-review")!) {
                        HStack(spacing: 8) {
                            Image(systemName: "star.fill")
                                .font(.subheadline)
                                .foregroundStyle(sunYellow)
                            Text("앱스토어에 리뷰 남기기")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(jadeDeep)
                        }
                        .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.plain)
                    .listRowBackground(sunYellow.opacity(0.08))
                }

                Section {
                    VStack(alignment: .leading, spacing: 12) {
                        Label {
                            Text("유치원 카드의 비교 버튼을 눌러 최대 3곳을 비교하세요.")
                                .font(.caption)
                                .foregroundStyle(slateBlue)
                        } icon: {
                            Image(systemName: "square.split.2x2")
                                .foregroundStyle(jadeDeep)
                        }
                        Label {
                            Text("찜한곳에서 왼쪽 스와이프로 삭제, 오른쪽 스와이프로 비교에 추가할 수 있어요.")
                                .font(.caption)
                                .foregroundStyle(slateBlue)
                        } icon: {
                            Image(systemName: "hand.draw")
                                .foregroundStyle(jadeDeep)
                        }
                    }
                    .padding(.vertical, 4)
                } header: {
                    MoreSectionHeader(title: "이용 팁")
                }

                Section {
                    StatRow(title: "유치원 정보", value: "유치원 알리미 공공데이터")
                    StatRow(title: "후기", value: "네이버 블로그/카페")
                    StatRow(title: "지도", value: "카카오맵")
                } header: {
                    MoreSectionHeader(title: "데이터 출처")
                }

                Section {
                    VStack(spacing: 8) {
                        BrandGlyphView(size: 48, cornerRadius: 14)
                        Text("우리동네 유치원")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(slateBlue)
                        Text("가까운 유치원 찾기")
                            .font(.caption2)
                            .foregroundStyle(slateSoft)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                }
                .listRowBackground(Color.clear)

                #if DEBUG
                if isDebugModeActive {
                    Section {
                        StatRow(title: "검색 기준 위치", value: viewModel.locationLabel)
                        StatRow(title: "실제 기기 위치", value: {
                            if let loc = viewModel.currentDeviceLocation {
                                return String(format: "%.4f, %.4f", loc.lat, loc.lng)
                            }
                            return "아직 요청되지 않음"
                        }())
                        StatRow(title: "Kakao 지도 키", value: viewModel.configuration.hasKakaoMapKey ? "설정됨" : "키 없음")
                        StatRow(title: "Kakao Local 키", value: viewModel.configuration.hasKakaoRESTAPIKey ? "설정됨" : "키 없음")
                        StatRow(title: "Kakao 키 소스", value: viewModel.configuration.kakaoConfigurationSourceDescription)
                        StatRow(title: "딥링크", value: "wherekindergarten://compare?ids=...")
                        StatRow(title: "찜한 기관", value: "\(viewModel.favorites.count)곳")
                        StatRow(title: "최근 검색", value: "\(viewModel.recentSearches.count)건")
                        StatRow(title: "비교 목록", value: "\(viewModel.compareSelectionIDs.count)곳")
                    } header: {
                        MoreSectionHeader(title: "디버그")
                    }
                }
                #endif
            }
            .listStyle(.insetGrouped)
            .scrollContentBackground(.hidden)
            .background { NativeScreenBackground(topTintOpacity: 0.16) }
            .navigationTitle("더보기")
            .navigationBarTitleDisplayMode(.large)
            .task {
                viewModel.refreshLocationPermissionState()
            }
        }
    }
}

private struct MoreSectionHeader: View {
    let title: String

    var body: some View {
        Text(title)
            .font(.footnote.weight(.semibold))
            .foregroundStyle(slateSoft)
            .textCase(.uppercase)
    }
}

private struct StatRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(inkBlack)
            Spacer(minLength: 12)
            Text(value)
                .font(.subheadline)
                .foregroundStyle(slateSoft)
                .multilineTextAlignment(.trailing)
                .fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
}

private struct SettingsRow: View {
    let title: String
    let systemImage: String
    let tint: Color
    let url: URL

    var body: some View {
        Link(destination: url) {
            HStack(spacing: 12) {
                Image(systemName: systemImage)
                    .font(.body.weight(.medium))
                    .foregroundStyle(.white)
                    .frame(width: 28, height: 28)
                    .background(tint, in: RoundedRectangle(cornerRadius: 6, style: .continuous))

                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(inkBlack)
            }
        }
        .accessibilityElement(children: .combine)
    }
}
