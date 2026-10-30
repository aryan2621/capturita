import { CameraMotionBlur } from '@remotion/motion-blur';
import type { ComponentType } from 'react';

/**
 * Wraps a scene so that, unless its `motionBlur` setting is switched off, exports blur fast movement like a
 * real camera shutter. Export only (`rendering`, set by the studio renderer): it draws every
 * frame several times, which the live preview can't afford.
 */
export function withMotionBlur(Scene: ComponentType<Record<string, unknown>>): ComponentType<Record<string, unknown>> {
    return function Blurred(props: Record<string, unknown>) {
        if (props.motionBlur === false || !props.rendering) return <Scene {...props} />;
        return (
            <CameraMotionBlur shutterAngle={180} samples={6}>
                <Scene {...props} />
            </CameraMotionBlur>
        );
    };
}
