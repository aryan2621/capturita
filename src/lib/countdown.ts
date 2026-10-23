// Seconds of countdown before a recording starts (Settings → Recording). Kept in localStorage.

export type Countdown = 0 | 3 | 5;

const KEY = 'capturita.countdown';

export function loadCountdown(): Countdown {
    try {
        const value = Number(localStorage.getItem(KEY));
        return value === 0 || value === 5 ? value : 3;
    } catch {
        return 3;
    }
}

export function saveCountdown(value: Countdown) {
    try {
        localStorage.setItem(KEY, String(value));
    } catch {
        // The choice just isn't remembered.
    }
}
