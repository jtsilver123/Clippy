import AppKit
import SwiftUI

@main
struct CookedApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @ObservedObject private var model = AppModel.shared

    var body: some Scene {
        MenuBarExtra {
            MenuView()
                .environmentObject(model)
                .environmentObject(model.preferences)
        } label: {
            Image(systemName: model.hasActive ? "flame.fill" : "flame")
        }
        .menuBarExtraStyle(.window)
    }
}

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        // Menu bar only, no Dock icon (also set via LSUIElement when bundled).
        NSApp.setActivationPolicy(.accessory)
        AppModel.shared.start()
    }
}
