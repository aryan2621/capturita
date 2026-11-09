import { useCurrentFrame as useRealFrame, useVideoConfig as useRealConfig } from 'remotion';
import { AUTHORED_FPS } from './fps';

export function useCurrentFrame() {
    return (useRealFrame() * AUTHORED_FPS) / useRealConfig().fps;
}

export function useVideoConfig() {
    const config = useRealConfig();
    return { ...config, fps: AUTHORED_FPS, durationInFrames: (config.durationInFrames * AUTHORED_FPS) / config.fps };
}
