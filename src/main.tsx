import React from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { Toaster, toast } from 'sonner';
import { MainWindow } from './windows/MainWindow';
import { TooltipLayer } from './components/TooltipLayer';
import { LicenseProvider } from './lib/license';
import { initTheme, useTheme } from './lib/theme';
import './index.css';

initTheme();

function ThemedToaster() {
    const { theme } = useTheme();
    // Says which planner answered an AI request: the cloud model, the local one, or a fallback (with why).
    useEffect(() => {
        const unlisten = listen<{ by: string; detail: string }>('ai-planner', ({ payload }) => {
            const message = `Planned by ${payload.by}`;
            if (payload.by.includes('fallback')) toast.warning(message, { description: payload.detail });
            else toast.info(message, { description: payload.detail });
        });
        return () => {
            unlisten.then((u) => u());
        };
    }, []);
    return <Toaster theme={theme} position='bottom-right' richColors />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <LicenseProvider>
            <MainWindow />
            <ThemedToaster />
            <TooltipLayer />
        </LicenseProvider>
    </React.StrictMode>
);
