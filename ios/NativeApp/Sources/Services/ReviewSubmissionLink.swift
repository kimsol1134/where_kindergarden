import Foundation

/// 후기 링크 제보용 Google Form URL을 만든다.
///
/// 전국 유치원 중 후기가 3건 이상인 곳은 소수라, 상세 화면의 "후기 없음" 상태가
/// 가장 노출이 많은 화면 중 하나다. 이 화면을 제보 진입점으로 쓴다.
///
/// ## 설정 방법
///
/// 1. Google Forms에서 폼을 만들고 아래 두 개의 단답형 질문을 추가한다.
///    - 유치원명
///    - 유치원 코드 (제보를 어느 기관에 붙일지 식별하는 값)
/// 2. 폼 편집 화면에서 `⋮` → `미리 채워진 링크 만들기`로 두 칸에 아무 값이나 넣고 링크를 생성한다.
/// 3. 생성된 링크의 `entry.XXXXXXXXX` 숫자와 `/forms/d/e/<ID>/viewform`의 `<ID>`를
///    아래 세 상수에 옮겨 적는다.
///
/// 세 값이 비어 있으면 `isConfigured`가 `false`가 되고 제보 진입점은 화면에 나타나지 않는다.
/// 즉, 폼을 만들기 전에 배포해도 사용자에게 깨진 링크가 노출되지 않는다.
public enum ReviewSubmissionLink {

    /// `https://docs.google.com/forms/d/e/<여기>/viewform` 의 폼 ID.
    public static let formID = "1FAIpQLSftp8Z2T2xUNCsZ2xRase-SxYJI2y9fgSga9dsjAhC89h8YeA"

    /// 유치원명이 들어갈 질문의 `entry.` 번호.
    public static let kindergartenNameEntryID = "entry.1232816157"

    /// 유치원 코드가 들어갈 질문의 `entry.` 번호.
    public static let kindercodeEntryID = "entry.927994217"

    /// 세 상수가 모두 채워졌을 때만 제보 진입점을 노출한다.
    public static var isConfigured: Bool {
        !formID.isEmpty && !kindergartenNameEntryID.isEmpty && !kindercodeEntryID.isEmpty
    }

    /// 유치원명과 코드를 미리 채운 제보 폼 URL을 만든다.
    ///
    /// 사용자가 어느 유치원에 대한 제보인지 다시 입력하지 않아도 되도록,
    /// 두 값은 폼 열람 시점에 이미 채워진 상태가 된다.
    public static func url(kindergartenName: String, kindercode: String) -> URL? {
        makeURL(
            formID: formID,
            nameEntryID: kindergartenNameEntryID,
            kindercodeEntryID: kindercodeEntryID,
            kindergartenName: kindergartenName,
            kindercode: kindercode
        )
    }

    /// 폼 설정값을 인자로 받는 순수 빌더. 상수를 바꾸지 않고 테스트할 수 있도록 분리했다.
    static func makeURL(
        formID: String,
        nameEntryID: String,
        kindercodeEntryID: String,
        kindergartenName: String,
        kindercode: String
    ) -> URL? {
        guard !formID.isEmpty, !nameEntryID.isEmpty, !kindercodeEntryID.isEmpty else {
            return nil
        }

        var components = URLComponents(
            string: "https://docs.google.com/forms/d/e/\(formID)/viewform"
        )
        components?.queryItems = [
            URLQueryItem(name: "usp", value: "pp_url"),
            URLQueryItem(name: nameEntryID, value: kindergartenName),
            URLQueryItem(name: kindercodeEntryID, value: kindercode),
        ]

        return components?.url
    }
}
