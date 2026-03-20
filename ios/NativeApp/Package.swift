// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "NativeApp",
    platforms: [
        .iOS(.v17),
    ],
    products: [
        .library(name: "Models", targets: ["Models"]),
        .library(name: "Services", targets: ["Services"]),
        .library(name: "Features", targets: ["Features"]),
        .library(name: "AppShell", targets: ["AppShell"]),
    ],
    dependencies: [
        .package(url: "https://github.com/kakao-mapsSDK/KakaoMapsSDK-SPM.git", revision: "cc073a32729b7f545cca49f96d0b859fa3a0d5db"),
        .package(url: "https://github.com/googleads/swift-package-manager-google-mobile-ads.git", from: "12.0.0"),
        .package(url: "https://github.com/kakao/kakao-ios-sdk.git", from: "2.25.0"),
    ],
    targets: [
        .target(
            name: "Models"
        ),
        .target(
            name: "Services",
            dependencies: [
                "Models",
                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
                .product(name: "KakaoSDKCommon", package: "kakao-ios-sdk"),
                .product(name: "KakaoSDKShare", package: "kakao-ios-sdk"),
                .product(name: "KakaoSDKTemplate", package: "kakao-ios-sdk"),
            ]
        ),
        .target(
            name: "Features",
            dependencies: [
                "Models",
                "Services",
                .product(
                    name: "KakaoMapsSDK-SPM",
                    package: "KakaoMapsSDK-SPM",
                    condition: .when(platforms: [.iOS])
                ),
                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
            ]
        ),
        .target(
            name: "AppShell",
            dependencies: ["Models", "Services", "Features"]
        ),
        .testTarget(
            name: "NativeAppTests",
            dependencies: ["Models", "Services", "Features"]
        ),
    ]
)
