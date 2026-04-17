import XCTest
@testable import Domain
@testable import Models

final class DomainTests: XCTestCase {
    func testCompareToggleResultEquatable() {
        XCTAssertEqual(CompareToggleResult.added, CompareToggleResult.added)
        XCTAssertNotEqual(CompareToggleResult.added, CompareToggleResult.removed)
    }
}
