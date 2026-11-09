import AppKit

struct GrayImage: Sendable {
    let pixels: [UInt8]
    let width: Int
    let height: Int

    init(_ image: CGImage) {
        let w = image.width
        let h = image.height
        var data = [UInt8](repeating: 0, count: w * h)
        data.withUnsafeMutableBytes { buffer in
            let context = CGContext(data: buffer.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                                    space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue)
            context?.draw(image, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        width = w
        height = h
        pixels = data
    }
}

enum ScrollStitcher {
    private static let sameThreshold = 0.6
    private static let matchThreshold = 6.0

    static func meanDifference(_ a: GrayImage, _ b: GrayImage) -> Double {
        guard a.width == b.width, a.height == b.height else { return .infinity }
        var sum = 0
        var count = 0
        var y = 0
        while y < a.height {
            var x = 0
            while x < a.width {
                sum += abs(Int(a.pixels[y * a.width + x]) - Int(b.pixels[y * a.width + x]))
                count += 1
                x += 6
            }
            y += 3
        }
        return count == 0 ? .infinity : Double(sum) / Double(count)
    }

    /// How many pixels the content moved up between `previous` and `next`, or nil when the page ended or no match was found.
    static func shift(previous: GrayImage, next: GrayImage, expected: Int) -> Int? {
        guard previous.width == next.width, previous.height == next.height else { return nil }
        if meanDifference(previous, next) < sameThreshold { return nil }
        let width = previous.width
        let height = previous.height
        let bandStart = height * 2 / 10
        let bandEnd = height * 4 / 10
        var best = Double.infinity
        var bestShift = -1
        for s in 0...(height - bandEnd) {
            var sum = 0
            var y = bandStart
            while y < bandEnd {
                let n = y * width
                let p = (y + s) * width
                var x = 0
                while x < width {
                    sum += abs(Int(next.pixels[n + x]) - Int(previous.pixels[p + x]))
                    x += 4
                }
                y += 1
            }
            let samples = Double((bandEnd - bandStart) * ((width + 3) / 4))
            let score = Double(sum) / samples + Double(abs(s - expected)) * 0.001
            if score < best {
                best = score
                bestShift = s
            }
        }
        return best < matchThreshold && bestShift > 0 ? bestShift : nil
    }

    static func stitch(first: CGImage, slices: [(image: CGImage, shift: Int)]) -> CGImage? {
        let width = first.width
        let total = first.height + slices.reduce(0) { $0 + $1.shift }
        guard let context = CGContext(data: nil, width: width, height: total, bitsPerComponent: 8, bytesPerRow: 0,
                                      space: CGColorSpace(name: CGColorSpace.sRGB)!, bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        context.draw(first, in: CGRect(x: 0, y: total - first.height, width: width, height: first.height))
        var top = first.height
        for slice in slices {
            guard let part = slice.image.cropping(to: CGRect(x: 0, y: slice.image.height - slice.shift, width: width, height: slice.shift)) else { continue }
            context.draw(part, in: CGRect(x: 0, y: total - top - slice.shift, width: width, height: slice.shift))
            top += slice.shift
        }
        return context.makeImage()
    }
}
