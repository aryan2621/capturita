import { AbsoluteFill, Easing, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { Sparkles } from 'lucide-react';
import './fonts';
import { BrandTexture, clamp, SceneImage, sceneGradient, useExit } from './SceneBase';
import { FEATURE_ICONS } from './FeatureGrid';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';
import { ElementView } from './elements';
import { LAYER_BASE, layerAspect, layerFor, layerPose, type Layer } from './layers';

export interface CustomSceneProps {
    layers: Layer[];
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

const TEXT_STYLES = {
    headline: { size: 10, weight: 800, display: true },
    title: { size: 6.5, weight: 750, display: true },
    body: { size: 3.6, weight: 500, display: false, wrap: true },
    label: { size: 2.6, weight: 700, display: false },
} as const;

/** A free-form scene: text, shapes, icons, the logo and pictures placed by hand, each with an entrance and keyframes. */
export function CustomScene({ layers, transparent, brand, assets }: CustomSceneProps) {
    const exit = useExit();
    const { width, height } = useVideoConfig();
    const aspect = layerAspect(width, height);
    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), lineHeight: 1.15, opacity: exit }}>
            <BrandTexture brand={brand} transparent={transparent} />
            {(Array.isArray(layers) ? layers : []).map((layer, i) => (
                <LayerView key={i} layer={layerFor({ ...LAYER_BASE, ...layer }, aspect)} brand={brand} assets={assets} />
            ))}
        </AbsoluteFill>
    );
}

function LayerView({ layer, brand, assets }: { layer: Layer; brand: Brand; assets: SceneAssets }) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const u = layout.unit;
    const local = frame - layer.at * fps;
    if (local < 0) return null;
    const pose = layerPose(layer, frame / fps);
    const box = { width: (layer.w / 100) * width, height: (layer.h / 100) * height };
    const color = layer.color === 'white' ? '#ffffff' : layer.color === 'black' ? '#000000' : brand.colors[layer.color] ?? brand.colors.text;
    const p = layer.enter === 'none' ? 1 : interpolate(local, [0, fps * 0.6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
    const pop = layer.enter === 'pop' ? spring({ frame: local, fps, config: { damping: 12, stiffness: 160 } }) : 1;
    const enter = {
        opacity: layer.enter === 'pop' ? Math.min(1, local / 4) : layer.enter === 'type' || layer.enter === 'words' ? 1 : p,
        dx: layer.enter === 'slide' ? -(1 - p) * u * 8 : 0,
        dy: layer.enter === 'rise' ? (1 - p) * u * 4 : 0,
        scale: layer.enter === 'pop' ? 0.6 + 0.4 * pop : 1,
    };

    let content: React.ReactNode = null;
    if (layer.kind === 'text') {
        const style = TEXT_STYLES[layer.style] ?? TEXT_STYLES.title;
        const font = style.display ? brand.fonts.display : brand.fonts.body;
        // Body text wraps; the rest keep their lines and shrink to the box (labels with room for their letter spacing).
        const wrap = 'wrap' in style;
        const size = wrap ? layout.text * style.size : fitSize(layer.text, box.width * (layer.style === 'label' ? 0.85 : 1), font, layout.text * style.size, String(style.weight));
        const chars = layer.text.length;
        const typed = layer.enter === 'type' ? Math.floor(chars * Math.min(1, local / (fps * Math.min(2, chars * 0.045)))) : chars;
        const words = layer.text.split(/(\s+)/);
        content = (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    textAlign: layer.align,
                    color,
                    fontFamily: style.display ? displayFont(brand) : bodyFont(brand),
                    fontSize: size,
                    fontWeight: style.weight,
                    lineHeight: style.display ? 1.05 : 1.3,
                    letterSpacing: layer.style === 'label' ? size * 0.12 : style.display ? -size * 0.02 : 0,
                    textTransform: layer.style === 'label' ? 'uppercase' : undefined,
                    whiteSpace: wrap ? 'pre-wrap' : 'pre',
                }}
            >
                {layer.enter === 'words' ? (
                    <div>
                        {words.map((word, i) => {
                            const w = interpolate(local, [i * 2, i * 2 + 8], [0, 1], clamp);
                            return /^\s+$/.test(word) ? word : <span key={i} style={{ display: 'inline-block', opacity: w, transform: `translateY(${(1 - w) * size * 0.3}px)` }}>{word}</span>;
                        })}
                    </div>
                ) : (
                    <div>
                        {layer.text.slice(0, typed)}
                        {/* The rest stays laid out, so typing doesn't reflow the text. */}
                        {typed < chars && <span style={{ opacity: 0 }}>{layer.text.slice(typed)}</span>}
                    </div>
                )}
            </div>
        );
    } else if (layer.kind === 'shape') {
        const radius = { rect: 0, rounded: u * 2.5, circle: '50%', pill: 9999, line: 9999 }[layer.shape] ?? 0;
        content = <div style={{ width: '100%', height: '100%', background: color, borderRadius: radius }} />;
    } else if (layer.kind === 'icon') {
        const Icon = FEATURE_ICONS[layer.icon] ?? Sparkles;
        const side = Math.min(box.width, box.height);
        content = (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon width={side} height={side} color={color} strokeWidth={1.8} />
            </div>
        );
    } else if (layer.kind === 'element') {
        content = <ElementView element={layer.element} color={color} colors={brand.colors} local={local} fps={fps} width={box.width} height={box.height} />;
    } else if (layer.kind === 'logo' && brand.logo) {
        content = <Img src={assetUrl(assets, brand.logo)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
    } else {
        content = <SceneImage src={layer.kind === 'image' ? layer.image : ''} assets={assets} brand={brand} fit='contain' label={layer.kind === 'logo' ? 'Add a logo in Brand' : 'Add an image'} style={{ width: '100%', height: '100%', borderRadius: u }} />;
    }

    return (
        <div
            style={{
                position: 'absolute',
                left: (pose.x / 100) * width,
                top: (pose.y / 100) * height,
                width: box.width,
                height: box.height,
                opacity: pose.opacity * enter.opacity,
                transform: `translate(${enter.dx}px, ${enter.dy}px) rotate(${pose.rotate}deg) scale(${pose.scale * enter.scale})`,
                clipPath: layer.enter === 'wipe' ? `inset(0 ${(1 - p) * 100}% 0 0)` : undefined,
                filter: layer.enter === 'blur' && p < 1 ? `blur(${(1 - p) * u * 2}px)` : undefined,
            }}
        >
            {content}
        </div>
    );
}
