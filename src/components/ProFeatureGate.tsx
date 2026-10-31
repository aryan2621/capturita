import type { ReactNode } from 'react';
import { LockKeyhole } from 'lucide-react';
import { useLicense } from '../lib/license';
import { Button } from './ui';

export function ProFeatureGate({ feature, children }: { feature: string; children: ReactNode }) {
    const { license } = useLicense();
    if (!license.supported || license.pro) return children;

    return (
        <div className='flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-line bg-panel-2 p-6 text-center'>
            <span className='flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent'>
                <LockKeyhole className='h-5 w-5' />
            </span>
            <div>
                <p className='text-sm font-semibold'>{feature} is part of Capturita Pro</p>
                <p className='mt-1 max-w-sm text-xs text-muted'>Activate a Pro license in Settings to use this feature.</p>
            </div>
            <Button
                size='sm'
                variant='primary'
                onClick={() => window.dispatchEvent(new CustomEvent('capturita-open-license'))}
            >
                Open License Settings
            </Button>
        </div>
    );
}
