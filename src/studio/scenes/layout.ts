/**
 * How a scene lays itself out in a frame of any aspect (16:9, 9:16, 1:1, 4:5). Scenes size
 * everything in `unit` (1% of the short side) and keep text inside the safe margins. Shared by
 * the preview and the renderer, so keep app code out of it.
 */
export interface FrameLayout {
    /** 1% of the frame's short side. */
    unit: number;
    /** `unit` scaled up for text in tall frames, where the short side is the width. */
    text: number;
    /** Taller than wide (9:16, 4:5). */
    portrait: boolean;
    /** Not wide enough to put things side by side (portrait or about square). */
    stacked: boolean;
    /** Margins to keep text and key shapes inside, in pixels. */
    safeX: number;
    safeY: number;
}

export function frameLayout(width: number, height: number): FrameLayout {
    const unit = Math.min(width, height) / 100;
    const ratio = width / height;
    const portrait = ratio < 1 / 1.05;
    return {
        unit,
        // 9:16 gets 30% more, 4:5 about 12%: their short side is small for the frame.
        text: unit * (ratio < 0.7 ? 1.3 : portrait ? 1.12 : 1),
        portrait,
        stacked: ratio < 1.3,
        safeX: width * (portrait ? 0.08 : 0.06),
        safeY: height * (portrait ? 0.07 : 0.06),
    };
}

/** Card and list scenes drew small in a wide frame (a third of it empty); this fills it. Tall frames are already tight on width, so they grow less. */
export const grow = (width: number, height: number) => (width / height < 1.3 ? 1.1 : 1.45);
