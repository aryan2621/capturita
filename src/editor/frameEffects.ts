import type { CameraCorner, Edit } from './model';

export interface Watermark {
    text: string;
    corner: CameraCorner;
    opacity: number;
}

export interface Tilt {
    x: number;
    y: number;
}

export const MAX_TILT = 35;
const CARD_SCALE = 0.78;
const MESH = 10;
const PERSPECTIVE = 2.6;

export const hasTilt = (edit: Edit) => !!edit.tilt && (edit.tilt.x !== 0 || edit.tilt.y !== 0);

export function drawWatermark(ctx: CanvasRenderingContext2D, watermark: Watermark, width: number, height: number) {
    const text = watermark.text.trim();
    if (!text) return;
    const side = Math.min(width, height);
    const margin = side * 0.03;
    ctx.save();
    ctx.font = `600 ${Math.max(10, side * 0.026)}px system-ui, -apple-system, sans-serif`;
    ctx.globalAlpha = Math.min(1, Math.max(0, watermark.opacity));
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = side * 0.01;
    ctx.textBaseline = watermark.corner.startsWith('top') ? 'top' : 'bottom';
    ctx.textAlign = watermark.corner.endsWith('left') ? 'left' : 'right';
    ctx.fillText(text, watermark.corner.endsWith('left') ? margin : width - margin, watermark.corner.startsWith('top') ? margin : height - margin);
    ctx.restore();
}

type Point = { x: number; y: number };

const clampTilt = (value: number) => Math.min(MAX_TILT, Math.max(-MAX_TILT, value));

function project(u: number, v: number, width: number, height: number, tilt: Tilt): Point {
    const radiansX = (clampTilt(tilt.x) * Math.PI) / 180;
    const radiansY = (clampTilt(tilt.y) * Math.PI) / 180;
    const x = (u - 0.5) * width * CARD_SCALE;
    const y = (v - 0.5) * height * CARD_SCALE;
    const rotatedX = x * Math.cos(radiansY);
    const z1 = -x * Math.sin(radiansY);
    const rotatedY = y * Math.cos(radiansX) - z1 * Math.sin(radiansX);
    const z = y * Math.sin(radiansX) + z1 * Math.cos(radiansX);
    const scale = PERSPECTIVE / (PERSPECTIVE + z / Math.max(width, height));
    return { x: width / 2 + rotatedX * scale, y: height / 2 + rotatedY * scale };
}

function drawTriangle(ctx: CanvasRenderingContext2D, image: CanvasImageSource, source: Point[], target: Point[]) {
    const [s0, s1, s2] = source;
    const [d0, d1, d2] = target;
    const det = (s1.x - s0.x) * (s2.y - s0.y) - (s2.x - s0.x) * (s1.y - s0.y);
    if (Math.abs(det) < 1e-6) return;
    const a = ((d1.x - d0.x) * (s2.y - s0.y) - (d2.x - d0.x) * (s1.y - s0.y)) / det;
    const c = ((d2.x - d0.x) * (s1.x - s0.x) - (d1.x - d0.x) * (s2.x - s0.x)) / det;
    const b = ((d1.y - d0.y) * (s2.y - s0.y) - (d2.y - d0.y) * (s1.y - s0.y)) / det;
    const d = ((d2.y - d0.y) * (s1.x - s0.x) - (d1.y - d0.y) * (s2.x - s0.x)) / det;
    const centre = { x: (d0.x + d1.x + d2.x) / 3, y: (d0.y + d1.y + d2.y) / 3 };
    ctx.save();
    ctx.beginPath();
    target.forEach((p, i) => {
        const length = Math.hypot(p.x - centre.x, p.y - centre.y) || 1;
        const x = p.x + ((p.x - centre.x) / length) * 0.75;
        const y = p.y + ((p.y - centre.y) / length) * 0.75;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
    ctx.transform(a, b, c, d, d0.x - a * s0.x - c * s0.y, d0.y - b * s0.x - d * s0.y);
    ctx.drawImage(image, 0, 0);
    ctx.restore();
}

/** Draws `card` (a finished frame) as a card turned in 3D over `background`, using a mesh of small affine triangles. */
export function drawTilted(ctx: CanvasRenderingContext2D, card: HTMLCanvasElement, tilt: Tilt, width: number, height: number) {
    const corners = [project(0, 0, width, height, tilt), project(1, 0, width, height, tilt), project(1, 1, width, height, tilt), project(0, 1, width, height, tilt)];
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = Math.min(width, height) * 0.05;
    ctx.shadowOffsetY = Math.min(width, height) * 0.02;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    corners.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    for (let row = 0; row < MESH; row++) {
        for (let column = 0; column < MESH; column++) {
            const u0 = column / MESH;
            const u1 = (column + 1) / MESH;
            const v0 = row / MESH;
            const v1 = (row + 1) / MESH;
            const src = (u: number, v: number) => ({ x: u * card.width, y: v * card.height });
            const dst = (u: number, v: number) => project(u, v, width, height, tilt);
            drawTriangle(ctx, card, [src(u0, v0), src(u1, v0), src(u1, v1)], [dst(u0, v0), dst(u1, v0), dst(u1, v1)]);
            drawTriangle(ctx, card, [src(u0, v0), src(u1, v1), src(u0, v1)], [dst(u0, v0), dst(u1, v1), dst(u0, v1)]);
        }
    }
}

export const autoPadding = (width: number, height: number) => {
    const side = Math.max(width, height);
    return Math.round(Math.min(0.12, Math.max(0.04, 0.12 - (side / 3200) * 0.08)) * 200) / 200;
};
