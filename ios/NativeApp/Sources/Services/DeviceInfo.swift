import Foundation
import UIKit
import Darwin

public struct DeviceInfo: Sendable {
    public let appVersion: String       // CFBundleShortVersionString
    public let buildNumber: String      // CFBundleVersion
    public let osVersion: String        // UIDevice.current.systemVersion
    public let deviceModel: String      // sysctlbyname("hw.machine") or UIDevice.current.model
    public let locale: String           // Locale.current.identifier
    public let isTestFlight: Bool       // sandboxReceipt 여부
    public let daysSinceInstall: Int    // first_launch_at 기준 계산

    private static let firstLaunchAtKey = "analytics.first_launch_at"

    @MainActor
    public static func current(bundle: Bundle = .main) -> DeviceInfo {
        let appVersion = bundle.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let buildNumber = bundle.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""
        let osVersion = UIDevice.current.systemVersion
        let deviceModel = Self.resolveDeviceModel()
        let locale = Locale.current.identifier
        let isTestFlight = bundle.appStoreReceiptURL?.lastPathComponent == "sandboxReceipt"
        let daysSinceInstall = Self.resolveDaysSinceInstall()

        return DeviceInfo(
            appVersion: appVersion,
            buildNumber: buildNumber,
            osVersion: osVersion,
            deviceModel: deviceModel,
            locale: locale,
            isTestFlight: isTestFlight,
            daysSinceInstall: daysSinceInstall
        )
    }

    private static func resolveDeviceModel() -> String {
        var systemInfo = utsname()
        uname(&systemInfo)
        let machineMirror = Mirror(reflecting: systemInfo.machine)
        let identifier = machineMirror.children.reduce("") { result, element in
            guard let value = element.value as? Int8, value != 0 else { return result }
            return result + String(UnicodeScalar(UInt8(value)))
        }
        return identifier.isEmpty ? UIDevice.current.model : identifier
    }

    private static func resolveDaysSinceInstall() -> Int {
        let defaults = UserDefaults.standard
        let stored = defaults.double(forKey: firstLaunchAtKey)
        if stored > 0 {
            return Int((Date().timeIntervalSince1970 - stored) / 86400)
        } else {
            defaults.set(Date().timeIntervalSince1970, forKey: firstLaunchAtKey)
            return 0
        }
    }
}
