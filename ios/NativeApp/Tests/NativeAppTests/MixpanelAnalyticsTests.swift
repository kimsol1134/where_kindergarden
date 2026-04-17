import Foundation
import Mixpanel
import XCTest
@testable import Services

final class MixpanelAnalyticsTests: XCTestCase {

    func test_analyticsValue_string_convertsCorrectly() {
        let converted = MixpanelAnalytics.analyticsValueToMixpanel(.string("hello"))
        XCTAssertEqual(converted as? String, "hello")
    }

    func test_analyticsValue_int_convertsCorrectly() {
        let converted = MixpanelAnalytics.analyticsValueToMixpanel(.int(42))
        XCTAssertEqual(converted as? Int, 42)
    }

    func test_analyticsValue_double_convertsCorrectly() {
        let converted = MixpanelAnalytics.analyticsValueToMixpanel(.double(3.14))
        XCTAssertEqual(converted as? Double, 3.14)
    }

    func test_analyticsValue_bool_convertsCorrectly() {
        let converted = MixpanelAnalytics.analyticsValueToMixpanel(.bool(true))
        XCTAssertEqual(converted as? Bool, true)
    }

    func test_configure_idempotent_doesNotCrash() async {
        let suiteName = "test.\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suiteName)!
        let sessionTracker = SessionTracker(defaults: defaults)
        let deviceInfo = await MainActor.run { DeviceInfo.current() }

        await MainActor.run {
            MixpanelAnalytics.shared.configure(
                token: "test-token",
                sessionTracker: sessionTracker,
                deviceInfo: deviceInfo
            )
            MixpanelAnalytics.shared.configure(
                token: "test-token",
                sessionTracker: sessionTracker,
                deviceInfo: deviceInfo
            )
        }
    }
}
