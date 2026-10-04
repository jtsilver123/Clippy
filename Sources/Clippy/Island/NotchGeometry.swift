import AppKit

/// Where the hardware notch is (or where a fake one should go on screens without one).
struct NotchGeometry: Equatable {
    var screenFrame: NSRect
    var hasNotch: Bool
    /// The notch's size; on notchless screens, a virtual one centered in the menu bar.
    var notchSize: CGSize

    init(screen: NSScreen) {
        screenFrame = screen.frame
        if screen.safeAreaInsets.top > 0,
           let left = screen.auxiliaryTopLeftArea,
           let right = screen.auxiliaryTopRightArea {
            hasNotch = true
            notchSize = CGSize(width: screen.frame.width - left.width - right.width, height: screen.safeAreaInsets.top)
        } else {
            hasNotch = false
            let menuBar = screen.frame.maxY - screen.visibleFrame.maxY
            notchSize = CGSize(width: 150, height: menuBar > 0 ? menuBar : 24)
        }
    }

    /// The built-in display if it has a notch, otherwise the main screen.
    static func preferredScreen() -> NSScreen? {
        NSScreen.screens.first { $0.safeAreaInsets.top > 0 } ?? NSScreen.main ?? NSScreen.screens.first
    }
}

/// Island sizes for each presentation. Shared by the SwiftUI view and the hit-testing in the panel.
enum IslandLayout {
    /// The panel is a fixed transparent canvas; the island draws inside it.
    static let canvasSize = CGSize(width: 680, height: 340)
    static let compactSideWidth: CGFloat = 74
    static let spotlightWidth: CGFloat = 400
    static let rowHeight: CGFloat = 46
    static let maxRows = 5

    static func topRadius(for presentation: IslandPresentation) -> CGFloat {
        switch presentation {
        case .hidden, .compact: return 6
        case .spotlight, .list: return 14
        }
    }

    static func bottomRadius(for presentation: IslandPresentation) -> CGFloat {
        switch presentation {
        case .hidden, .compact: return 10
        case .spotlight, .list: return 26
        }
    }

    static func size(for presentation: IslandPresentation, geometry: NotchGeometry, rows: Int) -> CGSize {
        let notch = geometry.notchSize
        let flare = 2 * topRadius(for: presentation)
        switch presentation {
        case .hidden:
            return geometry.hasNotch ? CGSize(width: notch.width + flare, height: notch.height) : CGSize(width: notch.width, height: 0)
        case .compact:
            return CGSize(width: notch.width + 2 * compactSideWidth + flare, height: notch.height)
        case .spotlight:
            return CGSize(width: max(spotlightWidth, notch.width + 80) + flare, height: notch.height + 96)
        case .list:
            let count = CGFloat(min(max(rows, 1), maxRows))
            return CGSize(width: max(spotlightWidth, notch.width + 80) + flare, height: notch.height + count * rowHeight + 16)
        }
    }

    /// The area that should catch the mouse. When idle, hovering the notch itself reveals recent sessions.
    static func hitSize(for presentation: IslandPresentation, geometry: NotchGeometry, rows: Int) -> CGSize {
        if case .hidden = presentation {
            return rows > 0 ? CGSize(width: geometry.notchSize.width, height: geometry.notchSize.height) : .zero
        }
        return size(for: presentation, geometry: geometry, rows: rows)
    }
}
