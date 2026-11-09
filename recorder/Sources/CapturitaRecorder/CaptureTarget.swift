import AppKit
@preconcurrency import ScreenCaptureKit

struct CaptureTarget {
    let filter: SCContentFilter
    let configuration: SCStreamConfiguration
    let area: CGRect
    let pixelSize: CGSize
    let source: [String: Any]

    @MainActor
    static func resolve(_ sourceArgs: [String: Any]) async throws -> CaptureTarget {
        let content = try await SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: false)
        let filmSelf = ProcessInfo.processInfo.environment["CAPTURITA_KEEP_WINDOW"] != nil
        let excludedApps = filmSelf ? [] : content.applications.filter { Sources.ownProcessIDs.contains($0.processID) }

        let configuration = SCStreamConfiguration()
        switch sourceArgs.string("type") ?? "display" {
        case "window":
            guard let windowID = sourceArgs.number("windowId").map({ CGWindowID($0) }),
                  let window = content.windows.first(where: { $0.windowID == windowID })
            else { throw RecorderError("That window is no longer available") }
            let filter = SCContentFilter(desktopIndependentWindow: window)
            let scale = CGFloat(filter.pointPixelScale)
            let name = [window.owningApplication?.applicationName, window.title].compactMap { $0 }.filter { !$0.isEmpty }.joined(separator: " — ")
            return CaptureTarget(filter: filter, configuration: configuration, area: window.frame,
                                 pixelSize: CGSize(width: filter.contentRect.width * scale, height: filter.contentRect.height * scale),
                                 source: ["type": "window", "name": name])
        default:
            let displayID = sourceArgs.number("displayId").map { CGDirectDisplayID($0) } ?? CGMainDisplayID()
            guard let display = content.displays.first(where: { $0.displayID == displayID }) else {
                throw RecorderError("That display is no longer available")
            }
            let filter = SCContentFilter(display: display, excludingApplications: excludedApps, exceptingWindows: [])
            let scale = CGFloat(filter.pointPixelScale)
            let bounds = CGDisplayBounds(displayID)
            let displayName = Sources.screen(for: displayID)?.localizedName ?? "Display"
            if let region = rect(from: sourceArgs.dict("rect")) {
                configuration.sourceRect = region
                return CaptureTarget(filter: filter, configuration: configuration, area: region.offsetBy(dx: bounds.minX, dy: bounds.minY),
                                     pixelSize: CGSize(width: region.width * scale, height: region.height * scale),
                                     source: ["type": "area", "name": displayName])
            }
            return CaptureTarget(filter: filter, configuration: configuration, area: bounds,
                                 pixelSize: CGSize(width: CGFloat(display.width) * scale, height: CGFloat(display.height) * scale),
                                 source: ["type": "display", "name": displayName])
        }
    }

    @MainActor
    private static func capture(_ target: CaptureTarget) async throws -> CGImage {
        target.configuration.width = Int(target.pixelSize.width.rounded())
        target.configuration.height = Int(target.pixelSize.height.rounded())
        target.configuration.showsCursor = false
        target.configuration.colorSpaceName = CGColorSpace.sRGB
        return try await SCScreenshotManager.captureImage(contentFilter: target.filter, configuration: target.configuration)
    }

    private static func save(_ image: CGImage, source: [String: Any], area: CGRect, args: [String: Any]) throws -> [String: Any] {
        guard let dirPath = args.string("outputDir") else { throw RecorderError("outputDir is required") }
        guard let png = NSBitmapImageRep(cgImage: image).representation(using: .png, properties: [:]) else {
            throw RecorderError("Could not encode the screenshot")
        }
        let dir = URL(fileURLWithPath: dirPath, isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try png.write(to: dir.appendingPathComponent("screenshot.png"), options: .atomic)
        NSSound(named: NSSound.Name("Pop"))?.play()
        var described = source
        described["area"] = rectJSON(area)
        return ["width": image.width, "height": image.height, "source": described]
    }

    @MainActor
    static func screenshot(_ args: [String: Any]) async throws -> [String: Any] {
        guard CGPreflightScreenCaptureAccess() else { throw RecorderError("Screen recording permission is missing") }
        let target = try await resolve(args.dict("source") ?? [:])
        return try save(try await capture(target), source: target.source, area: target.area, args: args)
    }

    private static let maxScrollFrames = 40
    private static let maxScrollHeight = 24000

    @MainActor
    static func scrollingScreenshot(_ args: [String: Any]) async throws -> [String: Any] {
        guard CGPreflightScreenCaptureAccess() else { throw RecorderError("Screen recording permission is missing") }
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        guard AXIsProcessTrustedWithOptions(options) else {
            throw RecorderError("Allow Capturita under System Settings → Privacy & Security → Accessibility so it can scroll the window, then try again")
        }
        let target = try await resolve(args.dict("source") ?? [:])
        guard target.source["type"] as? String == "window" else { throw RecorderError("Scrolling capture needs a window") }

        let first = try await capture(target)
        let scale = target.pixelSize.height / target.area.height
        let stepPoints = max(80, target.area.height * 0.5)
        let expected = Int(stepPoints * scale)
        let centre = CGPoint(x: target.area.midX, y: target.area.midY)
        let cursorBefore = CGEvent(source: nil)?.location ?? centre

        var previousGray = GrayImage(first)
        var slices: [(image: CGImage, shift: Int)] = []
        var height = first.height
        for _ in 0..<maxScrollFrames {
            CGWarpMouseCursorPosition(centre)
            let event = CGEvent(scrollWheelEvent2Source: nil, units: .pixel, wheelCount: 1, wheel1: -Int32(stepPoints), wheel2: 0, wheel3: 0)
            event?.location = centre
            event?.post(tap: .cghidEventTap)
            try? await Task.sleep(for: .milliseconds(650))
            let next = try await capture(target)
            let nextGray = GrayImage(next)
            let before = previousGray
            let moved = await Task.detached(priority: .userInitiated) { ScrollStitcher.shift(previous: before, next: nextGray, expected: expected) }.value
            guard let moved else { break }
            slices.append((next, moved))
            height += moved
            previousGray = nextGray
            if height >= maxScrollHeight { break }
        }
        CGWarpMouseCursorPosition(cursorBefore)
        guard let stitched = ScrollStitcher.stitch(first: first, slices: slices) else { throw RecorderError("Could not join the screenshots") }
        return try save(stitched, source: target.source, area: target.area, args: args)
    }
}
