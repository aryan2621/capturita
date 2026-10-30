import { useEffect, useMemo, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import './fonts';
import { BrandTexture, clamp, sceneGradient, useExit } from './SceneBase';
import { frameLayout } from './layout';
import { fitSize } from './text';
import { assetUrl, bodyFont, displayFont, type Brand, type SceneAssets } from './assets';

export type Showcase3DSubject = 'phone' | 'laptop' | 'logo';
export type Showcase3DMotion = 'spin' | 'tilt' | 'orbit';

export interface Showcase3DProps {
    subject: Showcase3DSubject;
    /** Screenshot on the device's screen. */
    image: string;
    motion: Showcase3DMotion;
    headline: string;
    detail: string;
    transparent?: boolean;
    brand: Brand;
    assets: SceneAssets;
}

/** A texture for the scene, holding the render until it has loaded. */
function useTexture(src: string) {
    const [texture, setTexture] = useState<THREE.Texture | null>(null);
    const [handle] = useState(() => (src ? delayRender(`3D texture ${src}`) : null));
    useEffect(() => {
        if (!src || handle === null) return;
        new THREE.TextureLoader().load(
            src,
            (loaded) => {
                loaded.colorSpace = THREE.SRGBColorSpace;
                loaded.anisotropy = 8;
                setTexture(loaded);
                continueRender(handle);
            },
            undefined,
            () => continueRender(handle)
        );
    }, [src, handle]);
    return texture;
}

/** A stand-in drawn on a canvas: a brand gradient, with a letter for a missing logo. */
function useCanvasTexture(brand: Brand, letter: string) {
    return useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 512;
        const ctx = canvas.getContext('2d')!;
        const gradient = ctx.createLinearGradient(0, 0, 512, 512);
        gradient.addColorStop(0, brand.colors.accent);
        gradient.addColorStop(1, brand.colors.surface);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 512, 512);
        if (letter) {
            ctx.fillStyle = brand.colors.bg;
            ctx.font = `800 300px ${displayFont(brand)}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(letter, 256, 276);
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
    }, [brand, letter]);
}

/** Crops `texture` to cover a `ratio` (width over height) surface, like object-fit: cover. */
function cover(texture: THREE.Texture, ratio: number) {
    const image = texture.image as { width: number; height: number } | undefined;
    if (!image?.width) return texture;
    const own = image.width / image.height;
    const t = texture.clone();
    if (own > ratio) {
        t.repeat.set(ratio / own, 1);
        t.offset.set((1 - ratio / own) / 2, 0);
    } else {
        // Taller than the screen: show the top, like a scrolled-to-top page.
        t.repeat.set(1, own / ratio);
        t.offset.set(0, 1 - own / ratio);
    }
    t.needsUpdate = true;
    return t;
}

/** A flat rounded rectangle centred on the origin, with UVs 0–1 across it (so a texture fills it). */
function roundedRect(width: number, height: number, radius: number) {
    const [x, y, r] = [-width / 2, -height / 2, radius];
    const shape = new THREE.Shape();
    shape.moveTo(x + r, y);
    shape.lineTo(x + width - r, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + r);
    shape.lineTo(x + width, y + height - r);
    shape.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    shape.lineTo(x + r, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - r);
    shape.lineTo(x, y + r);
    shape.quadraticCurveTo(x, y, x + r, y);
    const geometry = new THREE.ShapeGeometry(shape, 8);
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / width, (pos.getY(i) - y) / height);
    return geometry;
}

function Screen({ texture, width, height, radius, z }: { texture: THREE.Texture; width: number; height: number; radius: number; z: number }) {
    const map = useMemo(() => cover(texture, width / height), [texture, width, height]);
    const geometry = useMemo(() => roundedRect(width, height, radius), [width, height, radius]);
    return (
        <mesh position={[0, 0, z]} geometry={geometry}>
            <meshBasicMaterial map={map} toneMapped={false} />
        </mesh>
    );
}

/** A black cut-out over the screen (the phone's island, the laptop's camera notch). */
function Cutout({ width, height, y, z }: { width: number; height: number; y: number; z: number }) {
    const geometry = useMemo(() => roundedRect(width, height, height / 2), [width, height]);
    return (
        <mesh position={[0, y, z]} geometry={geometry}>
            <meshBasicMaterial color='#000000' />
        </mesh>
    );
}

const BODY = { color: '#1b1d22', metalness: 0.6, roughness: 0.35 };

function Phone({ screen }: { screen: THREE.Texture }) {
    const body = useMemo(() => new RoundedBoxGeometry(0.78, 1.6, 0.08, 6, 0.09), []);
    const bump = useMemo(() => new RoundedBoxGeometry(0.3, 0.3, 0.02, 4, 0.06), []);
    return (
        <group>
            <mesh geometry={body}>
                <meshStandardMaterial {...BODY} />
            </mesh>
            <Screen texture={screen} width={0.7} height={1.52} radius={0.07} z={0.041} />
            <Cutout width={0.2} height={0.055} y={0.69} z={0.0415} />
            {/* Side buttons: power on the right, volume on the left. */}
            {[[0.392, 0.3, 0.16], [-0.392, 0.38, 0.1], [-0.392, 0.22, 0.1]].map(([x, y, h], i) => (
                <mesh key={i} position={[x, y, 0]}>
                    <boxGeometry args={[0.012, h, 0.03]} />
                    <meshStandardMaterial {...BODY} />
                </mesh>
            ))}
            {/* Camera bump and lenses on the back. */}
            <mesh geometry={bump} position={[-0.19, 0.57, -0.045]}>
                <meshStandardMaterial {...BODY} roughness={0.25} />
            </mesh>
            {[[-0.25, 0.63], [-0.13, 0.51], [-0.25, 0.51]].map(([x, y], i) => (
                <mesh key={i} position={[x, y, -0.058]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.045, 0.045, 0.012, 24]} />
                    <meshStandardMaterial color='#0a0b0d' metalness={0.9} roughness={0.15} />
                </mesh>
            ))}
        </group>
    );
}

/** Keyboard keys as [x, z, width]: five rows of 14, then a row with the space bar. */
const KEYS: [number, number, number][] = [
    ...Array.from({ length: 70 }, (_, i): [number, number, number] => [-0.7 + (i % 14) * 0.1077, -0.48 + Math.floor(i / 14) * 0.1, 0.09]),
    ...[-0.7, -0.592, -0.485, 0.485, 0.592, 0.7].map((x): [number, number, number] => [x, 0.02, 0.09]),
    [0, 0.02, 0.84],
];

function Laptop({ screen, open }: { screen: THREE.Texture; open: number }) {
    const base = useMemo(() => new RoundedBoxGeometry(1.7, 0.06, 1.15, 4, 0.025), []);
    const lid = useMemo(() => new RoundedBoxGeometry(1.7, 1.08, 0.035, 4, 0.015), []);
    const trackpad = useMemo(() => roundedRect(0.56, 0.34, 0.03), []);
    return (
        <group position={[0, -0.45, 0]}>
            <mesh geometry={base}>
                <meshStandardMaterial color='#9ea3ab' metalness={0.75} roughness={0.3} />
            </mesh>
            {KEYS.map(([x, z, w], i) => (
                <mesh key={i} position={[x, 0.034, z]}>
                    <boxGeometry args={[w, 0.008, 0.085]} />
                    <meshStandardMaterial color='#1c1d21' roughness={0.6} />
                </mesh>
            ))}
            <mesh geometry={trackpad} position={[0, 0.0305, 0.34]} rotation={[-Math.PI / 2, 0, 0]}>
                <meshStandardMaterial color='#8f949c' metalness={0.6} roughness={0.25} />
            </mesh>
            {/* The lid hinges on the base's back edge; `open` 1 is upright, tipped slightly back. */}
            <group position={[0, 0.03, -0.56]} rotation={[-(1 - open) * 1.45 - 0.12, 0, 0]}>
                <group position={[0, 0.54, 0]}>
                    <mesh geometry={lid}>
                        <meshStandardMaterial {...BODY} />
                    </mesh>
                    <Screen texture={screen} width={1.6} height={1.0} radius={0.025} z={0.019} />
                    <Cutout width={0.14} height={0.035} y={0.4825} z={0.0195} />
                </group>
            </group>
        </group>
    );
}

function LogoTile({ logo, brand }: { logo: THREE.Texture; brand: Brand }) {
    const image = logo.image as { width: number; height: number } | undefined;
    const ratio = image?.width ? Math.min(2.4, Math.max(0.6, image.width / image.height)) : 1;
    const w = ratio >= 1 ? 1.3 : 1.3 * ratio;
    const h = ratio >= 1 ? 1.3 / ratio : 1.3;
    const tile = useMemo(() => new RoundedBoxGeometry(w + 0.36, h + 0.36, 0.16, 6, 0.12), [w, h]);
    // A light tile under a dark logo (most are drawn for white pages), the brand surface under a light one.
    const dark = useMemo(() => {
        if (!image?.width) return false;
        const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
        ctx.canvas.width = ctx.canvas.height = 32;
        ctx.drawImage(image as CanvasImageSource, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        let sum = 0;
        let weight = 0;
        for (let i = 0; i < data.length; i += 4) {
            sum += (data[i + 3] / 255) * (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
            weight += data[i + 3] / 255;
        }
        return weight > 0 && sum / weight < 110;
    }, [image]);
    return (
        <group>
            <mesh geometry={tile}>
                <meshPhysicalMaterial color={dark ? '#f3f4f7' : brand.colors.surface} metalness={0.2} roughness={0.25} clearcoat={1} clearcoatRoughness={0.15} />
            </mesh>
            <mesh position={[0, 0, 0.081]}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial map={logo} transparent toneMapped={false} />
            </mesh>
        </group>
    );
}

/** A phone, a laptop or the logo on a tile, in 3D: it swings in and turns under a light in the brand colour. */
export function Showcase3D({ subject, image, motion, headline, detail, transparent, brand, assets }: Showcase3DProps) {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();
    const layout = frameLayout(width, height);
    const exit = useExit();
    const kind: Showcase3DSubject = ['phone', 'laptop', 'logo'].includes(subject) ? subject : 'phone';
    const hasText = !!(headline || detail);
    const side = hasText && !layout.stacked;

    const src = kind === 'logo' ? (brand.logo ? assetUrl(assets, brand.logo) : '') : image ? assetUrl(assets, image) : '';
    const loaded = useTexture(src);
    const fallback = useCanvasTexture(brand, kind === 'logo' ? (headline.trim()[0] ?? '•').toUpperCase() : '');
    const texture = loaded ?? fallback;

    // Entrance over about a second, then a slow drift to the end.
    const p = spring({ frame, fps, config: { damping: 16, stiffness: 70 } });
    const yaw = (motion === 'spin' ? -(1 - p) * Math.PI * 1.6 : motion === 'orbit' ? 0 : -(1 - p) * 0.5) - 0.32;
    const pitch = motion === 'tilt' ? (1 - p) * 0.9 + 0.12 : 0.1;
    const lift = (1 - p) * -0.8;
    const scale = (kind === 'phone' ? 1.35 : kind === 'laptop' ? 1.05 : 1.15) * (0.85 + 0.15 * p);

    // The canvas fills the device's area: right half beside text, or above it.
    const canvasW = Math.round(side ? width * 0.58 : width);
    const canvasH = Math.round(side || !hasText ? height : height * (layout.portrait ? 0.72 : 0.7));
    const textW = side ? width * 0.42 - layout.safeX * 1.5 : width - layout.safeX * 2;
    const headSize = fitSize(headline, textW, brand.fonts.display, layout.text * (side ? 6.5 : 6), '750');
    const textIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });

    return (
        <AbsoluteFill style={{ background: sceneGradient(brand, transparent), fontFamily: bodyFont(brand), opacity: exit }}>
            <BrandTexture brand={brand} transparent={transparent} />
            <div style={{ position: 'absolute', right: 0, top: 0, width: canvasW, height: canvasH }}>
                <ThreeCanvas width={canvasW} height={canvasH} camera={{ fov: 30, position: [0, 0, 5.2] }} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true }}>
                    <ambientLight intensity={0.55} />
                    <directionalLight position={[2.5, 3, 4]} intensity={2.2} />
                    <pointLight position={[-3, -1, 2]} intensity={6} color={brand.colors.accent} />
                    <group position={[0, lift, 0]} rotation={[pitch, yaw, 0]} scale={scale}>
                        {kind === 'phone' && <Phone screen={texture} />}
                        {kind === 'laptop' && <Laptop screen={texture} open={interpolate(frame, [6, 30], [0, 1], clamp)} />}
                        {kind === 'logo' && <LogoTile logo={texture} brand={brand} />}
                    </group>
                </ThreeCanvas>
            </div>
            {hasText && (
                <div
                    style={{
                        position: 'absolute',
                        left: layout.safeX,
                        width: textW,
                        ...(side ? { top: 0, bottom: 0, justifyContent: 'center' } : { bottom: layout.safeY, textAlign: 'center' }),
                        display: 'flex',
                        flexDirection: 'column',
                        gap: layout.unit * 1.6,
                        opacity: textIn,
                        transform: `translateY(${(1 - textIn) * layout.unit * 3}px)`,
                    }}
                >
                    {headline && <div style={{ fontFamily: displayFont(brand), fontWeight: 750, fontSize: headSize, lineHeight: 1.05, color: brand.colors.text, letterSpacing: -headSize * 0.02 }}>{headline}</div>}
                    {detail && <div style={{ fontSize: layout.text * 3.2, lineHeight: 1.35, color: brand.colors.muted }}>{detail}</div>}
                </div>
            )}
        </AbsoluteFill>
    );
}
