import Services
import SwiftUI

struct ParentSurveyCard: View {
    @Environment(\.openURL) private var openURL
    let survey: ParentSurveyCoordinator

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("유치원 알아보면서 아직 궁금한 게 있나요?")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(inkBlack)
                .fixedSize(horizontal: false, vertical: true)
            Text("1분만 들려주세요. 질문 3개 · 로그인 없이 참여")
                .font(.caption)
                .foregroundStyle(slateSoft)
                .fixedSize(horizontal: false, vertical: true)
            if let error = survey.openError {
                Text(error)
                    .font(.caption)
                    .foregroundStyle(inkBlack)
                    .accessibilityIdentifier("survey.openError")
            }
            HStack(spacing: 12) {
                Button {
                    guard let url = survey.beginOpening() else { return }
                    openURL(url) { accepted in
                        survey.finishOpening(accepted: accepted)
                    }
                } label: {
                    Text(survey.isOpening ? "여는 중…" : "의견 남기기")
                        .font(.subheadline.weight(.semibold))
                        .frame(minHeight: 44)
                        .padding(.horizontal, 16)
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .background(jadeDeep, in: RoundedRectangle(cornerRadius: 12))
                .disabled(survey.isOpening)
                .accessibilityIdentifier("survey.open")

                Button("닫기") { survey.dismiss() }
                    .font(.subheadline)
                    .buttonStyle(.plain)
                    .foregroundStyle(slateSoft)
                    .frame(minWidth: 44, minHeight: 44)
                    .accessibilityLabel("설문 안내 닫기")
                    .accessibilityIdentifier("survey.dismiss")
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(jadeGreen.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("survey.invitation")
        .onAppear { survey.recordImpression() }
    }
}
