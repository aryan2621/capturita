type Point = [number, number];

export function smoothPath(points: Point[], closed = false) {
    const count = points.length;
    const at = (index: number) => (closed ? points[(index + count) % count] : points[Math.min(count - 1, Math.max(0, index))]);
    let path = `M${points[0][0]},${points[0][1]}`;
    for (let i = 0; i < (closed ? count : count - 1); i++) {
        const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
        path += `C${p1[0] + (p2[0] - p0[0]) / 6},${p1[1] + (p2[1] - p0[1]) / 6} ${p2[0] - (p3[0] - p1[0]) / 6},${p2[1] - (p3[1] - p1[1]) / 6} ${p2[0]},${p2[1]}`;
    }
    return closed ? `${path}Z` : path;
}
