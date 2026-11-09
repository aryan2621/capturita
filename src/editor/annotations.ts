import type { NormalizedRect } from './model';
import type { Rect } from './render';

export type AnnotationKind = 'arrow' | 'box' | 'highlight' | 'text';

export interface Annotation {
    id: string;
    kind: AnnotationKind;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    color: string;
    text?: string;
}

export interface ScreenView {
    crop: NormalizedRect;
    content: Rect;
}

export const ANNOTATION_COLORS = ['#d97757', '#ff5c7a', '#ffd200', '#38ef7d', '#ffffff', '#111111'];
const ANNOTATION_KINDS: AnnotationKind[] = ['arrow', 'box', 'highlight', 'text'];
export const DEFAULT_ANNOTATION_TEXT = 'Label';

export const toFramePoint = (x: number, y: number, view: ScreenView) => ({
    x: view.content.x + ((x - view.crop.x) / view.crop.width) * view.content.width,
    y: view.content.y + ((y - view.crop.y) / view.crop.height) * view.content.height,
});

export const toScreenPoint = (x: number, y: number, view: ScreenView) => ({
    x: view.crop.x + ((x - view.content.x) / view.content.width) * view.crop.width,
    y: view.crop.y + ((y - view.content.y) / view.content.height) * view.crop.height,
});

export const normalizeAnnotations = (raw: unknown): Annotation[] =>
    Array.isArray(raw) ? raw.filter((a): a is Annotation => !!a && ANNOTATION_KINDS.includes(a.kind) && [a.x1, a.y1, a.x2, a.y2].every(Number.isFinite)) : [];

export function drawAnnotations(ctx: CanvasRenderingContext2D, annotations: Annotation[], view: ScreenView, frameWidth: number) {
    const stroke = Math.max(2, frameWidth * 0.004);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke;
    for (const a of annotations) {
        const from = toFramePoint(a.x1, a.y1, view);
        const to = toFramePoint(a.x2, a.y2, view);
        ctx.strokeStyle = a.color;
        ctx.fillStyle = a.color;
        if (a.kind === 'arrow') drawArrow(ctx, from, to, stroke);
        else {
            const x = Math.min(from.x, to.x);
            const y = Math.min(from.y, to.y);
            const w = Math.abs(to.x - from.x);
            const h = Math.abs(to.y - from.y);
            if (a.kind === 'text') drawLabel(ctx, a, { x, y, width: w, height: h });
            else if (a.kind === 'highlight') {
                ctx.globalAlpha = 0.3;
                ctx.fillRect(x, y, w, h);
                ctx.globalAlpha = 1;
            } else {
                ctx.beginPath();
                ctx.roundRect(x, y, w, h, stroke * 1.5);
                ctx.stroke();
            }
        }
    }
    ctx.restore();
}

const isLight = (hex: string) => {
    const value = parseInt(hex.replace('#', ''), 16);
    return 0.299 * (value >> 16) + 0.587 * ((value >> 8) & 255) + 0.114 * (value & 255) > 150;
};

function drawLabel(ctx: CanvasRenderingContext2D, a: Annotation, box: Rect) {
    const text = a.text?.trim() || DEFAULT_ANNOTATION_TEXT;
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.width, box.height, Math.min(box.height / 2, 14));
    ctx.fill();
    let size = Math.max(8, box.height * 0.55);
    ctx.font = `600 ${size}px system-ui, -apple-system, sans-serif`;
    const fit = (box.width * 0.88) / Math.max(1, ctx.measureText(text).width);
    if (fit < 1) {
        size *= fit;
        ctx.font = `600 ${size}px system-ui, -apple-system, sans-serif`;
    }
    ctx.fillStyle = isLight(a.color) ? '#111111' : '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, box.x + box.width / 2, box.y + box.height / 2 + size * 0.04);
}

function drawArrow(ctx: CanvasRenderingContext2D, from: { x: number; y: number }, to: { x: number; y: number }, stroke: number) {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length < 1) return;
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const head = Math.min(length * 0.6, stroke * 5);
    const base = { x: to.x - Math.cos(angle) * head * 0.8, y: to.y - Math.sin(angle) * head * 0.8 };
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(base.x, base.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x, to.y);
    ctx.lineTo(to.x - Math.cos(angle - 0.45) * head, to.y - Math.sin(angle - 0.45) * head);
    ctx.lineTo(to.x - Math.cos(angle + 0.45) * head, to.y - Math.sin(angle + 0.45) * head);
    ctx.closePath();
    ctx.fill();
}

const distanceToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

export function hitAnnotation(a: Annotation, point: { x: number; y: number }, view: ScreenView, tolerance: number) {
    const from = toFramePoint(a.x1, a.y1, view);
    const to = toFramePoint(a.x2, a.y2, view);
    if (a.kind === 'arrow') return distanceToSegment(point, from, to) <= tolerance;
    return point.x >= Math.min(from.x, to.x) - tolerance && point.x <= Math.max(from.x, to.x) + tolerance && point.y >= Math.min(from.y, to.y) - tolerance && point.y <= Math.max(from.y, to.y) + tolerance;
}
