import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { api, errorMessage, type LicenseState } from './api';

const EMPTY: LicenseState = {
    supported: false,
    pro: false,
    email: null,
    plan: null,
    updatesUntil: null,
    error: null,
    notice: null,
};

interface LicenseContextValue {
    license: LicenseState;
    loading: boolean;
    refresh: () => Promise<void>;
}

const LicenseContext = createContext<LicenseContextValue>({
    license: EMPTY,
    loading: true,
    refresh: async () => {},
});

export function LicenseProvider({ children }: { children: ReactNode }) {
    const [license, setLicense] = useState(EMPTY);
    const [loading, setLoading] = useState(true);
    const refreshing = useRef(false);

    const refresh = useCallback(async () => {
        if (refreshing.current) return;
        refreshing.current = true;
        try {
            setLicense(await api.licenseState());
        } catch (error) {
            console.error('Could not check the Capturita license:', error);
            setLicense({ ...EMPTY, supported: true, error: errorMessage(error) });
        } finally {
            refreshing.current = false;
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
        const onFocus = () => void refresh();
        window.addEventListener('focus', onFocus);
        const interval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
        return () => {
            window.removeEventListener('focus', onFocus);
            window.clearInterval(interval);
        };
    }, [refresh]);

    return <LicenseContext.Provider value={{ license, loading, refresh }}>{children}</LicenseContext.Provider>;
}

export function useLicense() {
    return useContext(LicenseContext);
}
