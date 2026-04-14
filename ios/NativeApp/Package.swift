// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "NativeApp",
    platforms: [
        .iOS(.v17),
    ],
    products: [
        .library(name: "Models", targets: ["Models"]),
        .library(name: "Domain", targets: ["Domain"]),
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
        // Layer 0: 순수 데이터 모델
        .target(name: "Models"),

        // Layer 1: 비즈니스 로직 (Models만 의존)
        .target(
            name: "Domain",
            dependencies: ["Models"]
        ),

        // Layer 2: 데이터 소스 + 외부 서비스 (Models, Domain 의존)
        .target(
            name: "Services",
            dependencies: [
                "Models",
                "Domain",
                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
                .product(name: "KakaoSDKCommon", package: "kakao-ios-sdk"),
                .product(name: "KakaoSDKShare", package: "kakao-ios-sdk"),
                .product(name: "KakaoSDKTemplate", package: "kakao-ios-sdk"),
            ]
        ),

        // Layer 3: UI (Models, Domain, Services 의존)
        .target(
            name: "Features",
            dependencies: [
                "Models",
                "Domain",
                "Services",
                .product(
                    name: "KakaoMapsSDK-SPM",
                    package: "KakaoMapsSDK-SPM",
                    condition: .when(platforms: [.iOS])
                ),
                .product(name: "GoogleMobileAds", package: "swift-package-manager-google-mobile-ads"),
            ]
        ),

        // App Shell: 조립 + 진입점
        .target(
            name: "AppShell",
            dependencies: ["Models", "Domain", "Services", "Features"]
        ),

        // 테스트
        .testTarget(
            name: "DomainTests",
            dependencies: ["Models", "Domain"]
        ),
        .testTarget(
            name: "NativeAppTests",
            dependencies: ["Models", "Services", "Features"]
        ),
    ]
)
