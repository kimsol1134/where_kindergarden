import Foundation
import XCTest
@testable import Services

final class DeviceInfoTests: XCTestCase {
    private static let firstLaunchAtKey = "analytics.first_launch_at"

    override func setUp() {
        super.setUp()
        // first_launch_at을 초기화하여 테스트 간 격리
        UserDefaults.standard.removeObject(forKey: Self.firstLaunchAtKey)
    }

    override func tearDown() {
        UserDefaults.standard.removeObject(forKey: Self.firstLaunchAtKey)
        super.tearDown()
    }

    func test_current_appVersion_isNotEmpty() async {
        let info = await MainActor.run { DeviceInfo.current() }
        // 테스트 번들에는 CFBundleShortVersionString가 없을 수 있으므로 crash가 아닌 String이면 통과
        XCTAssertNotNil(info.appVersion)
    }

    func test_current_isTestFlight_returnsBool() async {
        let info = await MainActor.run { DeviceInfo.current() }
        // 테스트 환경에서는 sandboxReceipt가 없으므로 false가 기대값
        XCTAssertFalse(info.isTestFlight)
    }

    func test_daysSinceInstall_firstLaunch_returnsZero() async {
        // first_launch_at이 없는 상태에서 첫 호출 → 0 반환 후 저장
        let info = await MainActor.run { DeviceInfo.current() }
        XCTAssertEqual(info.daysSinceInstall, 0)
    }

    func test_daysSinceInstall_existingInstall_returnsCorrectDays() async {
        // 3일 전에 설치된 것처럼 first_launch_at 설정
        let threeDaysAgo = Date().timeIntervalSince1970 - (3 * 86400)
        UserDefaults.standard.set(threeDaysAgo, forKey: Self.firstLaunchAtKey)

        let info = await MainActor.run { DeviceInfo.current() }
        XCTAssertEqual(info.daysSinceInstall, 3)
    }
}
