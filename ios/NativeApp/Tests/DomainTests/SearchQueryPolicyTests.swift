import XCTest
@testable import Domain

final class SearchQueryPolicyTests: XCTestCase {

    // MARK: - isIncompleteHangulJamo

    func testCompatibilityJamoAreIncomplete() {
        for character: Character in ["ㄱ", "ㄴ", "ㅅ", "ㅈ", "ㅎ", "ㅏ", "ㅣ", "ㅡ"] {
            XCTAssertTrue(
                SearchQueryPolicy.isIncompleteHangulJamo(character),
                "\(character)는 조합 중 자모로 판정되어야 한다"
            )
        }
    }

    func testCompletedSyllablesAreNotIncomplete() {
        for character: Character in ["가", "강", "남", "유", "치", "원"] {
            XCTAssertFalse(
                SearchQueryPolicy.isIncompleteHangulJamo(character),
                "\(character)는 완성된 글자다"
            )
        }
    }

    func testNonHangulCharactersAreNotIncomplete() {
        for character: Character in ["a", "Z", "1", " ", "-", "울"] {
            XCTAssertFalse(SearchQueryPolicy.isIncompleteHangulJamo(character))
        }
    }

    // MARK: - isJamoOnly

    func testJamoOnlyDetectsPartialInput() {
        XCTAssertTrue(SearchQueryPolicy.isJamoOnly("ㄱ"))
        XCTAssertTrue(SearchQueryPolicy.isJamoOnly("ㄱㄴ"))
        XCTAssertTrue(SearchQueryPolicy.isJamoOnly("  ㅅ  "))
    }

    func testJamoOnlyIsFalseForEmptyAndCompleteInput() {
        XCTAssertFalse(SearchQueryPolicy.isJamoOnly(""))
        XCTAssertFalse(SearchQueryPolicy.isJamoOnly("   "))
        XCTAssertFalse(SearchQueryPolicy.isJamoOnly("강"))
        XCTAssertFalse(SearchQueryPolicy.isJamoOnly("강ㄴ"))
    }

    // MARK: - normalizedQuery

    /// 한글 IME가 "강남"을 만드는 동안 거치는 실제 중간 상태들.
    func testNormalizedQueryFollowsHangulCompositionSteps() {
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("ㄱ"), "")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("가"), "가")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("강"), "강")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("강ㄴ"), "강")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("강나"), "강나")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("강남"), "강남")
    }

    func testNormalizedQueryStripsMultipleTrailingJamo() {
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("서울ㄱㄴ"), "서울")
    }

    func testNormalizedQueryKeepsLeadingJamoInsideCompleteText() {
        // 자모가 중간에 있으면 뒤에 완성 글자가 있으므로 잘라내지 않는다.
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("ㄱ강남"), "ㄱ강남")
    }

    func testNormalizedQueryTrimsWhitespace() {
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("  강남  "), "강남")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("  ㅇ  "), "")
    }

    func testNormalizedQueryPreservesNonHangulQueries() {
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("Gangnam"), "Gangnam")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("서초구 123"), "서초구 123")
    }

    func testNormalizedQueryOnEmptyInput() {
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery(""), "")
        XCTAssertEqual(SearchQueryPolicy.normalizedQuery("     "), "")
    }
}
