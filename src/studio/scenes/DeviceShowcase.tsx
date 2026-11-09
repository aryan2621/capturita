import type { Zoom } from '../../editor/model';
import { AbsoluteFill } from 'remotion';
import { useVideoConfig } from './clock';
import './fonts';
import { BrandTexture, Depth, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { Copy, DeviceFrame, Landing, easeOut, fitScreen, useTiming } from './deviceParts';
import { bodyFont, type Brand, type RecordingInfo, type SceneAssets, type Segment } from './assets';
import { RecordingVideo } from './RecordingVideo';

type DeviceKind = 'macbook' | 'browser' | 'window';
type HeadlinePlacement = 'side' | 'below' | 'none';

export interface DeviceShowcaseProps {
    device: DeviceKind;
    segment: Segment;
    headline: string;
    detail: string;
    placement: HeadlinePlacement;
    url: string;
    brand: Brand;
    recording: RecordingInfo;
    assets: SceneAssets;
    /** Zoom-ins on the clicks in the segment, seconds from its start (set when the scene is made). */
    zooms?: Zoom[];
    /** Turn the zooms off (anything but false keeps them). */
    clickZoom?: boolean;
}

/**
 * The recording playing inside a drawn device. The device tips up and lands on a spring with a
 * flash of light, the camera eases in a little, and an optional headline slides in beside or under it.
 */
export function DeviceShowcase({ device, segment, headline, detail, placement, url, brand, recording, assets, zooms, clickZoom }: DeviceShowcaseProps) {
    const { ramp } = useTiming();
    const { width, height, durationInFrames } = useVideoConfig();
    const layout = frameLayout(width, height);
    const { unit, text: t } = layout;
    const { colors } = brand;
    const exit = useExit();
    const hasText = placement !== 'none' && !!(headline.trim() || detail.trim());
    // Frames too narrow for side by side put the text under the device.
    const side = hasText && placement === 'side' && !layout.stacked;

    // Sizes leave room for the push-in (5%).
    const areaW = width * (side ? 0.5 : layout.portrait ? 0.84 : 0.72);
    const areaH = height * (hasText && !side ? 0.54 : 0.72);
    const { sw, sh, outerH } = fitScreen(device, unit, areaW, areaH, recording.width / recording.height);

    const push = 1 + 0.05 * ramp(0, durationInFrames * 0.8, easeOut);
    const textW = side ? width * 0.3 : Math.min(width * 0.84, width - layout.safeX * 2);

    const copy = hasText && <Copy brand={brand} headline={headline} detail={detail} width={textW} size={t * (side ? 6.4 : 5.6)} align={side ? 'left' : 'center'} />;

    return (
        <AbsoluteFill style={{ background: `radial-gradient(110% 90% at 50% 100%, ${colors.surface} 0%, ${colors.bg} 70%)`, fontFamily: bodyFont(brand), lineHeight: 1.2, opacity: exit }}>
            <Depth z={-0.5}><BrandTexture brand={brand} /></Depth>
            <Depth z={1}>
                <AbsoluteFill style={{ flexDirection: side ? 'row' : 'column', alignItems: 'center', justifyContent: 'center', gap: side ? unit * 7 : unit * 4, transform: `scale(${push})` }}>
                    {side && copy}
                    <Landing brand={brand} u={unit} outerH={outerH}>
                        <DeviceFrame kind={device} sw={sw} sh={sh} u={unit} brand={brand} url={url}>
                            <RecordingVideo recording={recording} assets={assets} segment={segment} zooms={clickZoom === false ? undefined : zooms} />
                        </DeviceFrame>
                    </Landing>
                    {!side && copy}
                </AbsoluteFill>
            </Depth>
        </AbsoluteFill>
    );
}
