import type { CSSProperties } from 'react';
import { Freeze, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';
import type { Zoom } from '../../editor/model';
import { cameraViewport } from '../../editor/motion';
import { assetUrl, type RecordingInfo, type SceneAssets, type Segment } from './assets';

const FULL = { x: 0, y: 0, width: 1, height: 1 };

/**
 * A part of the screen recording, playing from the scene's first frame at normal speed and
 * holding its last frame if the scene runs longer (or its first, when `still`). Source times map
 * to the file's own times through the track offset, as the editor's export does. In renders this
 * is Remotion's frame-exact video; in the preview Player it falls back to a <video> element.
 * `zooms` (seconds from the segment's start) move the editor's zoom camera over it.
 */
export function RecordingVideo({ recording, assets, segment, still, style, zooms }: { recording: RecordingInfo; assets: SceneAssets; segment: Segment; still?: boolean; style?: CSSProperties; zooms?: Zoom[] }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const first = Math.max(0, Math.round((segment.start - recording.offset) * fps));
    const length = Math.max(1, Math.round((segment.end - segment.start) * fps));
    const held = still ? 0 : length - 1;
    const video = (
        <Freeze frame={held} active={still || frame >= length}>
            <OffthreadVideo src={assetUrl(assets, recording.file)} trimBefore={first} muted style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', ...style }} />
        </Freeze>
    );
    if (!zooms?.length || still) return video;
    const view = cameraViewport({ zooms, crop: FULL, cursor: null, cursorAnimation: 'off', screen: 'smooth' }, Math.min(frame, held) / fps);
    return (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
            <div style={{ width: '100%', height: '100%', transformOrigin: '0 0', transform: `scale(${1 / view.width}) translate(${-view.x * 100}%, ${-view.y * 100}%)` }}>{video}</div>
        </div>
    );
}
