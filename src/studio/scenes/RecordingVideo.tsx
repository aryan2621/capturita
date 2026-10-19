import type { CSSProperties } from 'react';
import { Freeze, OffthreadVideo, useCurrentFrame, useVideoConfig } from 'remotion';
import { assetUrl, type RecordingInfo, type SceneAssets, type Segment } from './assets';

/**
 * A part of the screen recording, playing from the scene's first frame at normal speed and
 * holding its last frame if the scene runs longer (or its first, when `still`). Source times map
 * to the file's own times through the track offset, as the editor's export does. In renders this
 * is Remotion's frame-exact video; in the preview Player it falls back to a <video> element.
 */
export function RecordingVideo({ recording, assets, segment, still, style }: { recording: RecordingInfo; assets: SceneAssets; segment: Segment; still?: boolean; style?: CSSProperties }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const first = Math.max(0, Math.round((segment.start - recording.offset) * fps));
    const length = Math.max(1, Math.round((segment.end - segment.start) * fps));
    const held = still ? 0 : length - 1;
    return (
        <Freeze frame={held} active={still || frame >= length}>
            <OffthreadVideo src={assetUrl(assets, recording.file)} trimBefore={first} muted style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', ...style }} />
        </Freeze>
    );
}
