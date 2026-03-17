import SwiftUI

public struct MoreView: View {
    public init() {}

    public var body: some View {
        NavigationStack {
            List {
                Section("탐색 보조 기능") {
                    Label("우리 아이 성향 테스트", systemImage: "sparkles.rectangle.stack.fill")
                    Label("앱 사용 가이드", systemImage: "questionmark.circle")
                }

                Section("서비스 정보") {
                    Label("서비스 소개", systemImage: "text.book.closed")
                    Label("개인정보처리방침", systemImage: "lock.shield")
                    Label("피드백 보내기", systemImage: "paperplane")
                }

                Section("출시 준비") {
                    Label("App Store 스크린샷", systemImage: "photo.on.rectangle")
                    Label("브랜드 체크리스트", systemImage: "checkmark.seal")
                }
            }
            .navigationTitle("더보기")
        }
    }
}
