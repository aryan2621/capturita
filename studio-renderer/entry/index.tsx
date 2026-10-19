import type { ComponentType } from 'react';
import { Composition, registerRoot } from 'remotion';
import { SCENE_FPS, SCENES, TIMELINE_COMPOSITION } from '../../src/studio/scenes';
import { DEFAULT_BRAND } from '../../src/studio/scenes/assets';
import { TransparentTimeline } from '../../src/studio/TransparentTimeline';

// Registers every scene in the app's scene list, so the renderer and the in-app Player draw the
// same components. Size and length here are defaults; each render job sets its own.
function Root() {
    return (
        <>
            {Object.entries(SCENES).map(([id, scene]) => (
                <Composition
                    key={id}
                    id={id}
                    component={scene.component}
                    durationInFrames={Math.round(scene.defaultDuration * SCENE_FPS)}
                    fps={SCENE_FPS}
                    width={1920}
                    height={1080}
                    defaultProps={{ ...scene.defaultProps, brand: DEFAULT_BRAND }}
                />
            ))}
            {/* The whole timeline as one transparent layer (scenes and overlays only), for transparent export. */}
            <Composition
                id={TIMELINE_COMPOSITION}
                component={TransparentTimeline as ComponentType<Record<string, unknown>>}
                durationInFrames={SCENE_FPS}
                fps={SCENE_FPS}
                width={1920}
                height={1080}
                defaultProps={{ items: [], overlays: [] }}
            />
        </>
    );
}

registerRoot(Root);
