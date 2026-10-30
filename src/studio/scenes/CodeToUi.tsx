import { AbsoluteFill, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { CodeTyping } from './CodeTyping';
import { clamp, useExit } from './SceneBase';
import { UiCard, uiCardBeat, type UiCardProps } from './UiCard';
import type { Brand, SceneAssets } from './assets';

export interface CodeToUiProps extends Omit<UiCardProps, 'brand'> {
    heading: string;
    fileName: string;
    code: string;
    speed: number;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const FPS = 30;
const HOLD = 14; // frames the finished code stays up before it turns into the window
const MORPH = 16;

/** Frame the code starts turning into the window: typing ends (as in CodeTyping), plus a short hold. */
export const codeToUiSwitch = ({ code, speed }: { code?: string; speed?: number }) =>
    10 + Math.ceil((String(code ?? '').replace(/\t/g, '    ').length / Math.max(5, Number(speed) || 40)) * FPS) + HOLD;

/** Seconds until the window's last click. */
export const codeToUiBeat = (props: { code?: string; speed?: number; toggles?: { text?: string }[] }) => codeToUiSwitch(props) / FPS + uiCardBeat(props);

/**
 * CodeTyping, then the finished code gives way to a UiCard (what the code builds). The UiCard
 * shows only the user's own feature text, never a real product's screen.
 */
export function CodeToUi(props: CodeToUiProps) {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    const exit = useExit();
    const at = codeToUiSwitch(props);
    const p = interpolate(frame, [at, at + MORPH], [0, 1], clamp);
    const { code, speed, heading, fileName, ...card } = props;
    return (
        <AbsoluteFill style={{ opacity: exit }}>
            {p < 1 && (
                <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 - p * 0.06})`, filter: `blur(${p * 6}px)` }}>
                    <CodeTyping heading={heading} fileName={fileName} code={code} speed={speed} transparent={props.transparent} brand={props.brand} assets={props.assets} />
                </AbsoluteFill>
            )}
            <Sequence from={at} durationInFrames={Math.max(1, durationInFrames - at)} layout="none">
                <UiCard {...(card as UiCardProps)} />
            </Sequence>
        </AbsoluteFill>
    );
}
