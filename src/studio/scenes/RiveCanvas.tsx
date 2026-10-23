import RiveRuntime, { type Artboard, type LinearAnimationInstance, type StateMachineInstance } from '@rive-app/canvas-advanced';
import { useEffect, useRef, useState } from 'react';
import { cancelRender, continueRender, delayRender, useCurrentFrame, useVideoConfig } from 'remotion';
// The runtime's wasm is bundled (the package's default fetches it from a CDN, which fails offline).
// Vite serves `?url` imports; the renderer's webpack has a matching rule (render.mjs).
import WASM from '@rive-app/canvas-advanced/rive.wasm?url';
let runtime: ReturnType<typeof RiveRuntime> | null = null;
const loadRuntime = () => (runtime ??= RiveRuntime({ locateFile: () => WASM }));

type Rive = Awaited<ReturnType<typeof RiveRuntime>>;
type Player = { artboard: Artboard; animation: LinearAnimationInstance | null; machine: StateMachineInstance | null; time: number };

/** "speed=2, on=true" as input values. */
function parseInputs(text: string): Map<string, number | boolean> {
    const out = new Map<string, number | boolean>();
    for (const pair of text.split(',')) {
        const [name, raw = ''] = pair.split('=').map((s) => s.trim());
        if (!name) continue;
        out.set(name, raw === 'true' ? true : raw === 'false' ? false : Number(raw) || 0);
    }
    return out;
}

/**
 * A Rive file at the current frame: an artboard (default when blank), playing a named animation or
 * state machine (blank: its first state machine, else its first animation), with state machine
 * inputs set once at the start. Frames are drawn from the start's state, so seeking is exact.
 */
export function RiveCanvas({ src, width, height, artboard, play, inputs }: { src: string; width: number; height: number; artboard: string; play: string; inputs: string }) {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const canvas = useRef<HTMLCanvasElement>(null);
    const [handle] = useState(() => delayRender(`Loading Rive ${src}`));
    const [loaded, setLoaded] = useState<{ rive: Rive; file: Awaited<ReturnType<Rive['load']>>; renderer: ReturnType<Rive['makeRenderer']> } | null>(null);
    const player = useRef<Player | null>(null);

    useEffect(() => {
        let cancelled = false;
        Promise.all([loadRuntime(), fetch(src).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`HTTP ${r.status}`))))])
            .then(async ([rive, bytes]) => {
                const file = await rive.load(new Uint8Array(bytes));
                if (cancelled) return;
                setLoaded({ rive, file, renderer: rive.makeRenderer(canvas.current!) });
                continueRender(handle);
            })
            .catch((error) => cancelRender(error));
        return () => {
            cancelled = true;
        };
    }, [src, handle]);

    // A fresh player at time 0 for these settings.
    const start = (rive: Rive, file: NonNullable<typeof loaded>['file']): Player => {
        let board: Artboard;
        try {
            board = artboard ? file.artboardByName(artboard) : file.defaultArtboard();
        } catch {
            board = file.defaultArtboard();
        }
        const find = <T,>(byName: (n: string) => T): T | null => {
            try {
                return play ? byName(play) ?? null : null;
            } catch {
                return null;
            }
        };
        const named = { machine: find((n) => board.stateMachineByName(n)), animation: find((n) => board.animationByName(n)) };
        const machineDef = named.machine ?? (!named.animation && board.stateMachineCount() ? board.stateMachineByIndex(0) : null);
        const animationDef = machineDef ? null : named.animation ?? (board.animationCount() ? board.animationByIndex(0) : null);
        const machine = machineDef ? new rive.StateMachineInstance(machineDef, board) : null;
        const animation = animationDef ? new rive.LinearAnimationInstance(animationDef, board) : null;
        if (machine) {
            const values = parseInputs(inputs);
            for (let i = 0; i < machine.inputCount(); i++) {
                const input = machine.input(i);
                const value = values.get(input.name);
                if (value === undefined) continue;
                if (input.type === rive.SMIInput.number) input.asNumber().value = Number(value);
                else if (input.type === rive.SMIInput.bool) input.asBool().value = Boolean(value);
                else if (input.type === rive.SMIInput.trigger && value) input.asTrigger().fire();
            }
        }
        return { artboard: board, animation, machine, time: 0 };
    };

    useEffect(() => {
        if (!loaded) return;
        player.current?.machine?.delete();
        player.current?.animation?.delete();
        player.current?.artboard.delete();
        player.current = null;
    }, [loaded, artboard, play, inputs]);

    useEffect(() => {
        if (!loaded || !canvas.current) return;
        const { rive, file, renderer } = loaded;
        const target = frame / fps;
        // Going back replays from the start; going forward steps one frame at a time, as state machines need.
        if (!player.current || target < player.current.time - 1e-6) {
            player.current?.machine?.delete();
            player.current?.animation?.delete();
            player.current?.artboard.delete();
            player.current = start(rive, file);
        }
        const p = player.current;
        const step = (dt: number) => {
            if (p.machine) p.machine.advance(dt);
            if (p.animation) {
                p.animation.advance(dt);
                p.animation.apply(1);
            }
            p.artboard.advance(dt);
        };
        if (p.time === 0) step(0);
        while (p.time < target - 1e-6) {
            const dt = Math.min(1 / fps, target - p.time);
            step(dt);
            p.time += dt;
        }
        renderer.clear();
        renderer.save();
        renderer.align(rive.Fit.contain, rive.Alignment.center, { minX: 0, minY: 0, maxX: canvas.current.width, maxY: canvas.current.height }, p.artboard.bounds);
        p.artboard.draw(renderer);
        renderer.restore();
        // Outside Rive's own animation loop, queued draws only reach the canvas here.
        rive.resolveAnimationFrame();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loaded, frame, fps, artboard, play, inputs]);

    return <canvas ref={canvas} width={Math.round(width)} height={Math.round(height)} style={{ width, height }} />;
}
