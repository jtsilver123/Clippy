// swift-tools-version:5.9
import PackageDescription

var targets: [Target] = [
    // Pure Foundation: event parsing, session state machine, hook installers,
    // Codex rollout tailing. Builds and tests on Linux too.
    .target(name: "ClippyCore"),
    .testTarget(name: "ClippyCoreTests", dependencies: ["ClippyCore"]),
]
var products: [Product] = [.library(name: "ClippyCore", targets: ["ClippyCore"])]

#if os(macOS)
targets.append(.executableTarget(name: "Clippy", dependencies: ["ClippyCore"]))
products.append(.executable(name: "Clippy", targets: ["Clippy"]))
#endif

let package = Package(
    name: "Clippy",
    platforms: [.macOS(.v13)],
    products: products,
    targets: targets
)
