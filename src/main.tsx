import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { ToastProvider } from './components/ui';
import { toast } from './lib/toast';
import { MainWindow } from './windows/MainWindow';
import { TooltipLayer } from './components/TooltipLayer';
import { LicenseProvider } from './lib/license';
import { initTheme } from './lib/theme';
import './index.css';

initTheme();

// Dev-only component gallery: open the Vite URL with #ui-preview.
const UiPreview = import.meta.env.DEV && location.hash === '#ui-preview' ? lazy(() => import('./components/UiPreview')) : null;

function PlannerToasts() {
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
    return null;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <LicenseProvider>
            {UiPreview && (
                <Suspense>
                    <UiPreview />
                </Suspense>
            )}
            <ToastProvider>
                <MainWindow />
                <PlannerToasts />
            </ToastProvider>
            <TooltipLayer />
        </LicenseProvider>
    </React.StrictMode>
);
