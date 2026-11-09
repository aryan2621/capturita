import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api, errorMessage, type Project } from '../lib/api';
import { toast } from '../lib/toast';
import { Button, Modal, Segmented, Switch, TextInput } from './ui';

const BREAKPOINTS = [
    { value: 390, label: 'Mobile' },
    { value: 834, label: 'Tablet' },
    { value: 1440, label: 'Desktop' },
];

export function WebCaptureDialog({ onClose, onCaptured }: { onClose: () => void; onCaptured: (project: Project) => void }) {
    const [url, setUrl] = useState('');
    const [width, setWidth] = useState(1440);
    const [dark, setDark] = useState(false);
    const [full, setFull] = useState(true);
    const [busy, setBusy] = useState(false);

    const capture = async () => {
        const address = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
        setBusy(true);
        try {
            onCaptured(await api.captureWebpage(address, width, dark, full));
        } catch (error) {
            toast.error(errorMessage(error));
            setBusy(false);
        }
    };

    return (
        <Modal onClose={onClose} dismissable={!busy} className='max-w-md'>
            <form
                className='space-y-5 p-5'
                onSubmit={(event) => {
                    event.preventDefault();
                    if (url.trim() && !busy) capture();
                }}
            >
                <h2 className='text-lg font-medium'>Capture a web page</h2>
                <label className='block space-y-1.5 text-sm'>
                    <span className='font-medium'>Address</span>
                    <TextInput value={url} onChange={(event) => setUrl(event.target.value)} placeholder='example.com' autoFocus disabled={busy} />
                </label>
                <div className='space-y-1.5 text-sm'>
                    <span className='font-medium'>Width</span>
                    <Segmented value={width} onChange={setWidth} options={BREAKPOINTS.map(({ value, label }) => ({ value, label }))} label='Width' />
                    <p className='text-xs text-muted'>{width} px wide</p>
                </div>
                <div className='flex items-center justify-between text-sm'>
                    <span>Dark mode</span>
                    <Switch checked={dark} onChange={setDark} label='Dark mode' disabled={busy} />
                </div>
                <div className='flex items-center justify-between text-sm'>
                    <span>Whole page</span>
                    <Switch checked={full} onChange={setFull} label='Whole page' disabled={busy} />
                </div>
                <div className='flex justify-end gap-2'>
                    <Button onClick={onClose} disabled={busy}>
                        Cancel
                    </Button>
                    <Button variant='primary' type='submit' disabled={busy || !url.trim()}>
                        {busy && <Loader2 className='h-4 w-4 animate-spin' />}
                        {busy ? 'Capturing…' : 'Capture'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
