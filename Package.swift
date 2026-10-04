// swift-tools-version:5.9
import PackageDescription

var targets: [Target] = [
    // Pure Foundation: event parsing, session state machine, hook installers,
    // Codex rollout tailing. Builds and tests on Linux too.
    .target(name: "CookedCore"),
    .testTarget(name: "CookedCoreTests", dependencies: ["CookedCore"]),
]
var products: [Product] = [.library(name: "CookedCore", targets: ["CookedCore"])]

#if os(macOS)
targets.append(.executableTarget(name: "Cooked", dependencies: ["CookedCore"]))
products.append(.executable(name: "Cooked", targets: ["Cooked"]))
#endif

let package = Package(
    name: "Cooked",
    platforms: [.macOS(.v13)],
    products: products,
    targets: targets
)
