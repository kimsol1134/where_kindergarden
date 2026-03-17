// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "NativeApp",
    platforms: [
        .iOS(.v17),
        .macOS(.v14),
    ],
    products: [
        .library(name: "Models", targets: ["Models"]),
        .library(name: "Services", targets: ["Services"]),
        .library(name: "Features", targets: ["Features"]),
        .library(name: "AppShell", targets: ["AppShell"]),
    ],
    targets: [
        .target(
            name: "Models"
        ),
        .target(
            name: "Services",
            dependencies: ["Models"]
        ),
        .target(
            name: "Features",
            dependencies: ["Models", "Services"]
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
