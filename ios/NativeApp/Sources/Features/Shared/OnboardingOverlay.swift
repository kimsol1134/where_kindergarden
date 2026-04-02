import SwiftUI

public struct OnboardingOverlay: View {
    @Binding var isPresented: Bool
    @State private var currentPage = 0

    private let pages: [(icon: String, title: String, description: String)] = [
        ("magnifyingglass", "주변 유치원 검색", "현재 위치나 동네 이름으로\n가까운 유치원을 찾아보세요"),
        ("square.split.2x2", "최대 3곳 비교", "교사 비율, 셔틀, 면적 등\n한눈에 비교할 수 있어요"),
        ("square.and.arrow.up", "가족에게 공유", "비교 결과를 카카오톡으로\n바로 보낼 수 있어요"),
    ]

    private var isLastPage: Bool {
        currentPage == pages.count - 1
    }

    public init(isPresented: Binding<Bool>) {
        _isPresented = isPresented
    }

    public var body: some View {
        ZStack {
            mistWhite.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                TabView(selection: $currentPage) {
                    ForEach(Array(pages.enumerated()), id: \.offset) { index, page in
                        VStack(spacing: 24) {
                            ZStack {
                                Circle()
                                    .fill(jadeGreen.opacity(0.12))
                                    .frame(width: 100, height: 100)
                                Image(systemName: page.icon)
                                    .font(.system(size: 40, weight: .medium))
                                    .foregroundStyle(jadeDeep)
                            }

                            Text(page.title)
                                .font(.title2.weight(.bold))
                                .foregroundStyle(inkBlack)

                            Text(page.description)
                                .font(.body)
                                .foregroundStyle(slateBlue)
                                .multilineTextAlignment(.center)
                                .lineSpacing(4)
                        }
                        .padding(.horizontal, 40)
                        .tag(index)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.3), value: currentPage)

                Spacer()

                // Page indicator
                HStack(spacing: 8) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        Circle()
                            .fill(index == currentPage ? jadeDeep : slateSoft.opacity(0.3))
                            .frame(width: 8, height: 8)
                            .animation(.easeInOut(duration: 0.2), value: currentPage)
                    }
                }
                .padding(.bottom, 32)

                // CTA Button
                Button {
                    if isLastPage {
                        isPresented = false
                    } else {
                        currentPage += 1
                    }
                } label: {
                    Text(isLastPage ? "시작하기" : "다음")
                        .font(.headline.weight(.bold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(jadeDeep, in: RoundedRectangle(cornerRadius: CornerRadius.medium, style: .continuous))
                }
                .buttonStyle(.plain)
                .padding(.horizontal, 24)

                if !isLastPage {
                    Button {
                        isPresented = false
                    } label: {
                        Text("건너뛰기")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(slateSoft)
                    }
                    .buttonStyle(.plain)
                    .padding(.top, 12)
                }

                Spacer()
                    .frame(height: 40)
            }
        }
    }
}
