import AppKit

/// Dynamic colors mirroring the app's tokens in src/index.css (light / dark).
enum Theme {
    private static func dynamic(light: NSColor, dark: NSColor) -> NSColor {
        NSColor(name: nil) { $0.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua ? dark : light }
    }

    private static func hex(_ value: UInt32, alpha: CGFloat = 1) -> NSColor {
        NSColor(
            srgbRed: CGFloat((value >> 16) & 0xff) / 255,
            green: CGFloat((value >> 8) & 0xff) / 255,
            blue: CGFloat(value & 0xff) / 255,
            alpha: alpha
        )
    }

    static let fg = dynamic(light: hex(0x0d0d0d), dark: hex(0xececec))
    static let muted = dynamic(light: hex(0x5d5d5d), dark: hex(0xb4b4b4))
    static let line = dynamic(light: NSColor.black.withAlphaComponent(0.10), dark: NSColor.white.withAlphaComponent(0.10))
    static let record = dynamic(light: hex(0xe5484d), dark: hex(0xef5a5f))
    static let warning = dynamic(light: hex(0xdc9a00), dark: hex(0xd9a400))

    /// CALayer colors don't follow appearance changes, so resolve against the app's current one.
    static func cg(_ color: NSColor) -> CGColor {
        var resolved = color.cgColor
        NSApp.effectiveAppearance.performAsCurrentDrawingAppearance { resolved = color.cgColor }
        return resolved
    }
}
