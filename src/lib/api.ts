import { convertFileSrc, invoke } from '@tauri-apps/api/core';

export type PermissionState = 'granted' | 'denied' | 'notDetermined';
export type PermissionKind = 'screen' | 'microphone' | 'camera';
export type Permissions = Record<PermissionKind, PermissionState>;

export interface Display {
    id: number;
    name: string;
    width: number;
    height: number;
    isMain: boolean;
}

export interface WindowSource {
    id: number;
    title: string;
    app: string;
    width: number;
    height: number;
    /** False for windows on another Space or behind a full-screen app. */
    isOnScreen: boolean;
    /** The owning app's icon as a data URL. */
    icon: string | null;
}

export interface Thumbnails {
    /** Data URLs keyed by display/window id. */
    displays: Record<string, string>;
    windows: Record<string, string>;
}

export interface Device {
    id: string;
    name: string;
}

export interface SourceList {
    displays: Display[];
    windows: WindowSource[];
    microphones: Device[];
    cameras: Device[];
}

export interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
}

export type CaptureSource = { type: 'display'; displayId: number; rect?: Rect } | { type: 'window'; windowId: number };

export interface RecordingOptions {
    source: CaptureSource;
    systemAudio: boolean;
    microphoneId: string | null;
    /** Removes speaker sound from the mic (voice processing). Off gives the rawest voice when using headphones. */
    echoCancellation: boolean;
    fps: number;
    /** Seconds to wait before starting; 0 starts at once. */
    countdown?: number;
}

export interface Track {
    file: string;
    /** Seconds from the start of the recording to the track's first sample. */
    offset: number;
    duration: number;
    width?: number;
    height?: number;
}

/** Video tracks always know their pixel size. */
export type VideoTrack = Track & { width: number; height: number };

export const isStudio = (project: Project) => project.kind === 'studio';

export interface Project {
    version: number;
    /** 'studio': motion scenes only. Its screen track is a placeholder with an empty `file`. */
    kind?: 'recording' | 'studio';
    id: string;
    path: string;
    createdAt: string;
    duration: number;
    source: { type: 'display' | 'window' | 'area'; name: string; area: Rect };
    tracks: {
        screen: VideoTrack;
        systemAudio: Track | null;
        microphone: Track | null;
        camera: VideoTrack | null;
        cursor: { file: string };
    };
}

export interface CursorData {
    version: number;
    /** [seconds, x, y] with x/y normalized to the captured area. */
    moves: [number, number, number][];
    clicks: [number, number, number, 'left' | 'right'][];
}

export type Status = 'idle' | 'countdown' | 'recording' | 'paused' | 'stopping';

export interface RecordingStatus {
    status: Status;
    startedAt: number | null;
    pausedMs: number;
    pausedAt: number | null;
}

/** Progress while making captions. */
export interface CaptionProgress {
    phase: 'download' | 'load' | 'transcribe';
    /** 0 to 1. */
    progress: number;
}

export type Destination = 'youtube' | 'drive';
export type Privacy = 'private' | 'unlisted' | 'public';

export const GOOGLE_SCOPES: Record<Destination, string> = {
    youtube: 'https://www.googleapis.com/auth/youtube.upload',
    drive: 'https://www.googleapis.com/auth/drive.file',
};

export interface GoogleAccount {
    email: string;
    scopes: string[];
}

export interface GoogleStatus {
    /** Whether a Client ID and Client Secret are saved (Settings → Google). */
    configured: boolean;
    /** The start and end of the saved Client ID. */
    clientIdPreview: string;
    account: GoogleAccount | null;
}

export interface AiModel {
    id: string;
    name: string;
    note: string;
    sizeMb: number;
    minRamGb: number;
    downloaded: boolean;
}

export interface AiCloud {
    enabled: boolean;
    hasKey: boolean;
    model: string;
}

export interface AiOpenAi {
    enabled: boolean;
    hasKey: boolean;
    baseUrl: string;
    model: string;
}

export interface AiModels {
    models: AiModel[];
    active: string;
    downloading: string | null;
    ramGb: number;
}

export interface UploadRequest {
    destination: Destination;
    path: string;
    title: string;
    description: string;
    privacy?: Privacy;
    /** YouTube only: path of the recording's custom thumbnail (thumb.jpg). */
    thumbnail?: string;
}

const helper = <T>(cmd: string, args?: Record<string, unknown>) => invoke<T>('recorder_request', { cmd, args });

export interface CaptionModel {
    id: string;
    label: string;
    note: string;
    sizeMb: number;
    downloaded: boolean;
    /** The model captions use. */
    selected: boolean;
}

export const api = {
    permissions: () => helper<Permissions>('permissions'),
    requestPermission: (kind: PermissionKind) => helper<Permissions>('requestPermission', { kind }),
    listSources: () => helper<SourceList>('listSources'),
    thumbnails: (displayIds: number[], windowIds: number[]) => helper<Thumbnails>('thumbnails', { displayIds, windowIds }),
    pickArea: (displayId: number) => helper<{ cancelled: boolean; rect?: Rect }>('pickArea', { displayId }),
    showCamera: (deviceId: string) => helper<void>('showCamera', { deviceId }),
    hideCamera: () => helper<void>('hideCamera'),

    status: () => invoke<RecordingStatus>('get_recording_status'),
    prepare: (options: RecordingOptions) => invoke<void>('prepare_recording', { options }),
    pause: () => invoke<void>('pause_recording'),
    resume: () => invoke<void>('resume_recording'),
    stop: () => invoke<void>('stop_recording'),
    cancel: () => invoke<void>('cancel_recording'),

    listRecordings: () => invoke<Project[]>('list_recordings'),
    createStudioProject: () => invoke<Project>('create_studio_project'),
    deleteRecording: (id: string) => invoke<void>('delete_recording', { id }),
    loadEdit: (id: string) => invoke<unknown | null>('load_edit', { id }),
    saveEdit: (id: string, edit: unknown, duration?: number) => invoke<void>('save_edit', { id, edit, duration }),
    /** Copies a song into the project folder; returns its file name there. */
    importMusic: async (id: string, file: File) =>
        invoke<string>('import_music', new Uint8Array(await file.arrayBuffer()), { headers: { id, name: encodeURIComponent(file.name) } }),
    /** Downloads a suggested song (nothing is stored until it is imported). */
    fetchMusic: async (url: string) => new Uint8Array(await invoke<ArrayBuffer>('fetch_music', { url })),
    /** Copies a voiceover or sound effect into the project's audio/ folder; returns its path there. */
    importAudio: async (id: string, kind: 'voice' | 'sfx', file: File) =>
        invoke<string>('import_audio', new Uint8Array(await file.arrayBuffer()), { headers: { id, kind, name: encodeURIComponent(file.name) } }),
    /** The Mac's text-to-speech voices. */
    speechVoices: () => invoke<{ name: string; language: string }[]>('speech_voices'),
    /** Reads a script aloud with a Mac voice into the project's audio/ folder; returns its path there. */
    speak: (id: string, text: string, voice: string) => invoke<string>('speak', { id, text, voice }),
    /** The licensed sound pack (Capturita/Sounds). */
    listSounds: () => invoke<{ dir: string; files: string[] }>('list_sounds'),
    /** Adds a file to the sound pack; returns its name there. */
    importSound: async (file: File) => invoke<string>('import_sound', new Uint8Array(await file.arrayBuffer()), { headers: { name: encodeURIComponent(file.name) } }),
    /** Copies a pack sound into the project (once); returns its path there. */
    useSound: (id: string, sound: string) => invoke<string>('use_sound', { id, sound }),
    importBackground: async (id: string, file: File) =>
        invoke<string>('import_background', new Uint8Array(await file.arrayBuffer()), { headers: { id, name: encodeURIComponent(file.name) } }),
    saveThumbnail: (id: string, jpeg: Blob) => jpeg.arrayBuffer().then((bytes) => invoke<void>('save_thumbnail', new Uint8Array(bytes), { headers: { id } })),
    /** File name of the 1080p preview copy of the screen video, made if needed. */
    makePreview: (id: string) => invoke<string>('make_preview', { id }),
    copyFileToClipboard: (path: string) => invoke<void>('copy_file_to_clipboard', { path }),
    recordingsDir: () => invoke<string>('recordings_dir'),
    restart: () => invoke<void>('restart_app'),
    log: (message: string) => invoke<void>('log_debug', { message }).catch(() => {}),

    /** The model AI editing uses now. */
    aiModel: () => invoke<{ id: string; name: string; downloaded: boolean; sizeMb: number }>('ai_model_status'),
    aiModels: () => invoke<AiModels>('ai_models'),
    setAiModel: (id: string) => invoke<void>('set_ai_model', { id }),
    deleteAiModel: (id: string) => invoke<void>('delete_ai_model', { id }),
    /** Downloads an AI model once, the chosen one by default (progress: `ai-progress` events, 0–1). */
    downloadAiModel: (id?: string) => invoke<void>('download_ai_model', { id }),
    cancelAiDownload: () => invoke<void>('cancel_ai_download'),
    /** Cloudflare's Clef decision model (only when its token is in the Keychain; otherwise this rejects). */
    aiDecide: (state: string, questions: object) => invoke<Record<string, any>>('ai_decide', { state, questions }),
    /** Claude in the cloud, for better planning (needs the user's API key). */
    aiCloud: () => invoke<AiCloud>('ai_cloud_status'),
    /** Turns Claude on or off; a new `key` is tried before it is kept in the Keychain. */
    saveAiCloud: (enabled: boolean, key?: string) => invoke<void>('ai_cloud_save', { enabled, key }),
    removeAiCloudKey: () => invoke<void>('ai_cloud_remove_key'),
    /** Any OpenAI-compatible cloud (OpenAI, Gemini, OpenRouter, Ollama…). */
    aiOpenAi: () => invoke<AiOpenAi>('ai_openai_status'),
    saveAiOpenAi: (enabled: boolean, baseUrl: string, model: string, key?: string) => invoke<void>('ai_openai_save', { enabled, baseUrl, model, key }),
    removeAiOpenAiKey: () => invoke<void>('ai_openai_remove_key'),
    /** The speech model captions use. */
    captionModel: () => invoke<CaptionModel>('caption_model_status'),
    /** Every speech model to choose from (the same as Murmur's). */
    captionModels: () => invoke<CaptionModel[]>('caption_models'),
    selectCaptionModel: (id: string) => invoke<void>('select_caption_model', { id }),
    /** Transcribes 16 kHz mono audio into timed words (progress: `captions-progress` events). */
    transcribe: (audio: Float32Array, language: string) =>
        invoke<{ start: number; end: number; text: string }[]>('transcribe', new Uint8Array(audio.buffer, audio.byteOffset, audio.byteLength), { headers: { language } }),
    cancelTranscription: () => invoke<void>('cancel_transcription'),
    /** Downloads the speech model ahead of time (progress: `captions-progress` events). */
    downloadCaptionModel: (id?: string) => invoke<void>('download_caption_model', { id }),
    deleteCaptionModel: (id?: string) => invoke<void>('delete_caption_model', { id }),
    /** Saves a text file in ~/Movies/Capturita/Exports; returns its path. */
    saveExportText: (name: string, extension: string, contents: string) => invoke<string>('save_export_text', { name, extension, contents }),

    googleStatus: () => invoke<GoogleStatus>('google_status'),
    googleSaveClient: (clientId: string, clientSecret: string) => invoke<void>('google_save_client', { clientId, clientSecret }),
    googleRemoveClient: () => invoke<void>('google_remove_client'),
    googleSignIn: (destination: Destination) => invoke<GoogleAccount>('google_sign_in', { destination }),
    googleSignOut: () => invoke<void>('google_sign_out'),
    upload: (request: UploadRequest) => invoke<{ id: string; url: string; thumbnailError: string | null }>('google_upload', { request }),
    cancelUpload: () => invoke<void>('google_cancel_upload'),
};

export const fileUrl = (project: Project, file: string) => convertFileSrc(`${project.path}/${file}`);

export const errorMessage = (error: unknown) => (typeof error === 'string' ? error : error instanceof Error ? error.message : 'Something went wrong');

export function formatDuration(seconds: number) {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = (total % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s}` : `${m}:${s}`;
}
