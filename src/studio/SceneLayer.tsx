import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import type { LayerFx } from '../editor/model';
import { SCENE_FPS, SCENES } from './scenes';
import type { SceneEnv } from './scenes/assets';
import { sceneInputProps } from './sceneEnv';
import { fxStyle } from './fxStyle';

/** A timeline scene or an overlay, as the layer draws it. */
export interface ScenePiece {
    id: string;
    scene: string;
    props: Record<string, unknown>;
    duration: number;
}

/** A piece on screen: seconds into it, its opacity (below 1 during a crossfade) and its transition look. */
export interface ActivePiece {
    id: string;
    time: number;
    opacity: number;
    fx?: LayerFx;
}

export interface SceneLayerHandle {
    /**
     * Shows the pieces on screen at the current time (called every frame by the preview loop),
     * and the colour wash of a dip transition over them.
     */
    update: (active: ActivePiece[], dip?: { color: string; opacity: number } | null) => void;
}

/**
 * Scenes (or overlays) drawn by Remotion Players stacked over the preview canvas. Each keeps its
 * Player mounted (hidden when off screen) so its fonts and layout are ready when the playhead
 * reaches it; the editor's clock moves them with seekTo, never their own playback. Overlays get
 * a transparent background, as in their rendered files.
 */
export const SceneLayer = forwardRef<SceneLayerHandle, { pieces: ScenePiece[]; overlay?: boolean; env: SceneEnv; width: number; height: number }>(function SceneLayer({ pieces, overlay = false, env, width, height }, ref) {
    const layers = useRef(new Map<string, { element: HTMLDivElement | null; player: PlayerRef | null; frame: number; visible: boolean }>());
    const dipRef = useRef<HTMLDivElement | null>(null);
    const scenes = useMemo(
        () =>
            pieces.flatMap((item) => {
                if (!SCENES[item.scene]) return [];
                const definition = SCENES[item.scene];
                return [{ item, definition, props: sceneInputProps(item, env, overlay), frames: Math.max(1, Math.round(item.duration * SCENE_FPS)) }];
            }),
        [pieces, overlay, env]
    );

    // Forget scenes that left the timeline.
    useEffect(() => {
        for (const id of layers.current.keys()) if (!scenes.some((s) => s.item.id === id)) layers.current.delete(id);
    }, [scenes]);

    const layer = (id: string) => {
        let entry = layers.current.get(id);
        if (!entry) {
            entry = { element: null, player: null, frame: -1, visible: false };
            layers.current.set(id, entry);
        }
        return entry;
    };

    useImperativeHandle(ref, () => ({
        update: (active, dip) => {
            const dipElement = dipRef.current;
            if (dipElement) {
                const shown = !!dip && dip.opacity > 0;
                dipElement.style.visibility = shown ? 'visible' : 'hidden';
                if (shown) {
                    dipElement.style.background = dip.color;
                    dipElement.style.opacity = String(dip.opacity);
                }
            }
            for (const [id, entry] of layers.current) {
                const scene = active.find((s) => s.id === id);
                const visible = !!scene && scene.opacity > 0;
                if (entry.element) {
                    if (visible !== entry.visible) entry.element.style.visibility = visible ? 'visible' : 'hidden';
                    if (scene) {
                        entry.element.style.opacity = String(scene.opacity);
                        const style = fxStyle(scene.fx, scene.fx?.blur ? Math.min(entry.element.clientWidth, entry.element.clientHeight) : 0);
                        entry.element.style.transform = style.transform;
                        entry.element.style.clipPath = style.clipPath;
                        entry.element.style.filter = style.filter;
                    }
                }
                entry.visible = visible;
                if (!scene || !entry.player) continue;
                const piece = scenes.find((s) => s.item.id === id);
                if (!piece) continue;
                const frames = piece.frames;
                const frame = Math.min(frames - 1, Math.max(0, Math.floor(scene.time * SCENE_FPS)));
                if (frame !== entry.frame) {
                    entry.frame = frame;
                    entry.player.seekTo(frame);
                }
            }
        },
    }));

    return (
        <div className='pointer-events-none absolute inset-0 overflow-hidden rounded-lg'>
            {scenes.map(({ item, definition, props, frames }) => (
                <div
                    key={item.id}
                    ref={(element) => {
                        layer(item.id).element = element;
                    }}
                    className='absolute inset-0'
                    style={{ visibility: 'hidden' }}
                >
                    <Player
                        ref={(player: PlayerRef | null) => {
                            const entry = layer(item.id);
                            entry.player = player;
                            entry.frame = -1;
                        }}
                        component={definition.component}
                        inputProps={props}
                        durationInFrames={frames}
                        fps={SCENE_FPS}
                        compositionWidth={width}
                        compositionHeight={height}
                        style={{ width: '100%', height: '100%' }}
                    />
                </div>
            ))}
            {!overlay && <div ref={dipRef} className='absolute inset-0' style={{ visibility: 'hidden' }} />}
        </div>
    );
});
