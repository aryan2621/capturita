import { AbsoluteFill, Sequence, interpolate, useVideoConfig as useRenderConfig } from 'remotion';
import { useCurrentFrame, useVideoConfig } from './clock';
import { Glow } from './deviceParts';
import { CodeTyping } from './CodeTyping';
import { clamp, useExit } from './SceneBase';
import { UiCard, uiCardBeat, type UiCardProps } from './UiCard';
import type { Brand, SceneAssets } from './assets';
import { AUTHORED_FPS as FPS } from './fps';

export interface CodeToUiProps extends Omit<UiCardProps, 'brand'> {
    heading: string;
    fileName: string;
    code: string;
    speed: number;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const HOLD = 8; // frames the finished code stays up before it turns into the window
const MORPH = 12;

/** Frame the code starts turning into the window: typing ends (as in CodeTyping), plus a short hold. */
const codeToUiSwitch = ({ code, speed }: { code?: string; speed?: number }) =>
    10 + Math.ceil((String(code ?? '').replace(/\t/g, '    ').length / Math.max(5, Number(speed) || 40)) * FPS) + HOLD;

/** Seconds until the window's last click. */
export const codeToUiBeat = (props: { code?: string; speed?: number; toggles?: { text?: string }[] }) => codeToUiSwitch(props) / FPS + uiCardBeat(props);

/**
 * CodeTyping, then the finished code gives way to a UiCard (what the code builds) through a flash
 * of accent light. The UiCard shows only the user's own feature text, never a real product's screen.
 */
export function CodeToUi(props: CodeToUiProps) {
    const frame = useCurrentFrame();
    const { width, height } = useVideoConfig();
    const render = useRenderConfig();
    const exit = useExit();
    const at = codeToUiSwitch(props);
    const p = interpolate(frame, [at, at + MORPH], [0, 1], clamp);
    const { code, speed, heading, fileName, ...card } = props;
    return (
        <AbsoluteFill style={{ opacity: exit }}>
            {/* The window sits under the code, which fades away to uncover it. */}
            <Sequence from={Math.round((at * render.fps) / FPS)} durationInFrames={Math.max(1, render.durationInFrames - Math.round((at * render.fps) / FPS))} layout="none">
                <UiCard {...(card as UiCardProps)} />
            </Sequence>
            {p < 1 && (
                <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 - p * 0.08})`, filter: `blur(${p * 6}px)` }}>
                    <CodeTyping heading={heading} fileName={fileName} code={code} speed={speed} transparent={props.transparent} brand={props.brand} assets={props.assets} />
                </AbsoluteFill>
            )}
            {p > 0 && p < 1 && <Glow x={width / 2} y={height / 2} r={Math.max(width, height) * 0.5} color={`${props.brand.colors.accent}66`} opacity={Math.sin(p * Math.PI)} />}
        </AbsoluteFill>
    );
}
