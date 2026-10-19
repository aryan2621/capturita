import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import { overlaysAt, positionAt, type OverlayClip, type TimelineItem } from '../editor/model';
import { fxStyle } from './fxStyle';
import { SCENE_FPS, SCENES } from './scenes';
import type { SceneAssets } from './scenes/assets';

// Kept free of app code: the studio renderer bundles this file too.

export interface TransparentTimelineProps {
    /** The timeline; scene items carry their full look props (sceneLookProps). */
    items: TimelineItem[];
    /** Overlays with their full look props (transparent background). */
    overlays: OverlayClip[];
    /** Injected by the renderer, like every scene's. */
    assets?: SceneAssets;
    [key: string]: unknown;
}

/** One scene at `time` seconds into it, on the same frame the preview's Player seeks to. */
function Piece({ scene, props, time, duration, assets }: { scene: string; props: Record<string, unknown>; time: number; duration: number; assets?: SceneAssets }) {
    const frame = useCurrentFrame();
    const Component = SCENES[scene]?.component;
    if (!Component) return null;
    const frames = Math.max(1, Math.round(duration * SCENE_FPS));
    const local = Math.min(frames - 1, Math.max(0, Math.floor(time * SCENE_FPS)));
    return (
        <Sequence from={frame - local} durationInFrames={frames}>
            <Component {...props} assets={assets} />
        </Sequence>
    );
}

/**
 * The whole timeline as a transparent layer for another editor: scenes (with their transitions
 * and dips) and overlays where they play, and nothing where the recording plays.
 */
export function TransparentTimeline({ items, overlays, assets }: TransparentTimelineProps) {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const t = frame / SCENE_FPS;
    const position = items.some((item) => item.kind === 'recording') ? positionAt(items, t) : null;
    const shortSide = Math.min(width, height);
    return (
        <AbsoluteFill style={{ background: 'transparent' }}>
            {position?.scenes.map((scene) => {
                const style = fxStyle(scene.fx, shortSide);
                return (
                    <AbsoluteFill key={scene.item.id} style={{ opacity: scene.opacity, transform: style.transform || undefined, clipPath: style.clipPath || undefined, filter: style.filter || undefined }}>
                        <Piece scene={scene.item.scene} props={scene.item.props} time={scene.time} duration={scene.item.duration} assets={assets} />
                    </AbsoluteFill>
                );
            })}
            {position?.dip && position.dip.opacity > 0 && <AbsoluteFill style={{ background: position.dip.color, opacity: position.dip.opacity }} />}
            {overlaysAt(overlays, t).map(({ item, time }) => (
                <AbsoluteFill key={item.id}>
                    <Piece scene={item.scene} props={item.props} time={time} duration={item.duration} assets={assets} />
                </AbsoluteFill>
            ))}
        </AbsoluteFill>
    );
}
