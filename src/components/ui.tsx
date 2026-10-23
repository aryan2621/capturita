import {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
    type ButtonHTMLAttributes,
    type InputHTMLAttributes,
    type ReactNode,
    type SelectHTMLAttributes,
} from 'react';

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'record';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
    primary: 'bg-accent text-accent-fg hover:bg-accent-hover shadow-sm',
    secondary: 'bg-panel-2 text-fg hover:bg-raised border border-line',
    ghost: 'text-muted hover:text-fg hover:bg-panel-2 disabled:hover:bg-transparent',
    subtle: 'bg-panel-2 text-fg hover:bg-raised',
    danger: 'bg-danger-soft text-danger-fg hover:bg-danger/25',
    record: 'bg-record text-white hover:bg-record-hover shadow-lg shadow-red-500/20',
};

const sizes: Record<Size, string> = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 text-sm',
    lg: 'h-11 px-6 text-sm',
    icon: 'h-9 w-9',
    'icon-sm': 'h-8 w-8',
};

export function Button({
    variant = 'secondary',
    size = 'md',
    className,
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
}) {
    return (
        <button
            className={cx(
                'inline-flex shrink-0 cursor-default items-center justify-center gap-2 rounded-lg font-medium transition-colors',
                'disabled:opacity-40',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}

/** Icon-only button. `label` is required: it becomes the tooltip and the accessible name. */
export function IconButton({
    label,
    variant = 'ghost',
    size = 'icon',
    children,
    ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'aria-label'> & {
    label: string;
    variant?: Variant;
    size?: 'icon' | 'icon-sm';
}) {
    return (
        <Button variant={variant} size={size} title={label} aria-label={label} {...props}>
            {children}
        </Button>
    );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <select
            className={cx(
                'h-9 w-full rounded-lg border border-line bg-panel-2 px-3 text-sm text-fg outline-none transition-colors hover:border-line-strong focus:border-accent',
                className
            )}
            {...props}
        >
            {children}
        </select>
    );
}

export function Switch({
    checked,
    onChange,
    disabled,
    label,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    disabled?: boolean;
    /** Shown as the tooltip and read by screen readers. */
    label: string;
}) {
    return (
        <button
            role='switch'
            aria-checked={checked}
            aria-label={label}
            title={`${label}: ${checked ? 'on' : 'off'}`}
            disabled={disabled}
            onClick={() => onChange(!checked)}
            className={cx(
                'relative h-5 w-9 shrink-0 rounded-full transition-colors before:absolute before:-inset-1 before:content-[""] disabled:opacity-40',
                checked ? 'bg-accent' : 'bg-line-strong'
            )}
        >
            <span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', checked ? 'left-[18px]' : 'left-0.5')} />
        </button>
    );
}

/**
 * One-of-many choice. The selected option is marked by an indicator that glides between
 * options (disabled by the reduced-motion setting via index.css).
 */
export function Segmented<T extends string | number>({
    value,
    options,
    onChange,
    size = 'md',
    label,
}: {
    value: T;
    options: { value: T; label?: string; icon?: ReactNode; hint?: string }[];
    onChange: (value: T) => void;
    size?: 'sm' | 'md';
    /** Accessible name of the group. */
    label?: string;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [indicator, setIndicator] = useState<{
        left: number;
        width: number;
    } | null>(null);
    const index = options.findIndex((option) => option.value === value);

    useLayoutEffect(() => {
        const container = containerRef.current;
        const place = () => {
            const button = container?.children[index + 1] as HTMLElement | undefined;
            setIndicator(button ? { left: button.offsetLeft, width: button.offsetWidth } : null);
        };
        place();
        if (!container) return;
        const observer = new ResizeObserver(place);
        observer.observe(container);
        return () => observer.disconnect();
    }, [index, options.length]);

    return (
        <div
            ref={containerRef}
            className='relative grid rounded-lg bg-panel-2 p-1'
            style={{
                gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
            }}
            role='radiogroup'
            aria-label={label}
            onKeyDown={(event) => {
                const step = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
                if (!step) return;
                event.preventDefault();
                const next = options[(Math.max(index, 0) + step + options.length) % options.length];
                onChange(next.value);
                requestAnimationFrame(() => (containerRef.current?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus());
            }}
        >
            <span
                aria-hidden
                className='absolute top-1 bottom-1 rounded-md bg-accent shadow-sm transition-[left,width] duration-[240ms] ease-in-out'
                style={indicator ? { left: indicator.left, width: indicator.width } : { opacity: 0 }}
            />
            {options.map((option) => {
                const active = option.value === value;
                return (
                    <button
                        key={String(option.value)}
                        role='radio'
                        aria-checked={active}
                        tabIndex={active || index < 0 ? 0 : -1}
                        title={option.hint ?? option.label}
                        aria-label={option.label ? undefined : option.hint}
                        onClick={() => onChange(option.value)}
                        className={cx(
                            'relative z-10 flex items-center justify-center gap-1.5 rounded-md px-2 transition-colors',
                            size === 'sm' ? 'h-7 text-xs' : 'h-8 text-sm',
                            active ? 'text-accent-fg' : 'text-muted hover:text-fg'
                        )}
                    >
                        {option.icon}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}

/** A range input with a filled track. */
export function RangeInput({
    value,
    min,
    max,
    className,
    style,
    ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max'> & { value: number; min: number; max: number }) {
    const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
    return (
        <input
            type='range'
            value={value}
            min={min}
            max={max}
            className={cx('slider', className)}
            style={{
                ...style,
                ['--fill' as string]: `${Math.min(100, Math.max(0, fill))}%`,
            }}
            {...props}
        />
    );
}

/** A labelled slider with its current value on the right. */
export function Slider({
    label,
    value,
    min,
    max,
    step,
    format,
    onChange,
    disabled,
    field,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step: number;
    format: (value: number) => string;
    onChange: (value: number) => void;
    disabled?: boolean;
    /** Replaces the read-only value, e.g. a TimeField for exact entry. */
    field?: ReactNode;
}) {
    return (
        <label className='block space-y-1'>
            <div className='flex justify-between text-xs'>
                <span className='text-fg'>{label}</span>
                {field ?? <span className='font-mono text-muted'>{format(value)}</span>}
            </div>
            <RangeInput
                value={value}
                min={min}
                max={max}
                step={step}
                disabled={disabled}
                onChange={(e) => onChange(Number(e.target.value))}
                title={`${label}: ${format(value)}`}
            />
        </label>
    );
}

export function Kbd({ children }: { children: ReactNode }) {
    return (
        <kbd className='inline-flex min-w-5 items-center justify-center rounded border border-line bg-panel-2 px-1.5 font-mono text-[11px] text-muted'>
            {children}
        </kbd>
    );
}

/**
 * A small floating panel anchored to its trigger. Closes on outside click or Esc.
 * `trigger` receives the open state and a toggle function.
 */
export function Popover({
    trigger,
    children,
    align = 'start',
    side = 'bottom',
}: {
    trigger: (open: boolean, toggle: () => void) => ReactNode;
    children: ReactNode | ((close: () => void) => ReactNode);
    align?: 'start' | 'end' | 'center';
    side?: 'top' | 'bottom';
}) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const close = () => setOpen(false);

    useEffect(() => {
        if (!open) return;
        const onPointer = (event: PointerEvent) => {
            if (!ref.current?.contains(event.target as Node)) setOpen(false);
        };
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', onPointer, true);
        document.addEventListener('keydown', onKey, true);
        return () => {
            document.removeEventListener('pointerdown', onPointer, true);
            document.removeEventListener('keydown', onKey, true);
        };
    }, [open]);

    return (
        <div ref={ref} className='relative'>
            {trigger(open, () => setOpen((o) => !o))}
            {open && (
                <div
                    className={cx(
                        'absolute z-40 min-w-56 rounded-xl border border-line bg-panel p-2 shadow-panel',
                        side === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
                        align === 'start' && 'left-0',
                        align === 'end' && 'right-0',
                        align === 'center' && 'left-1/2 -translate-x-1/2'
                    )}
                >
                    {typeof children === 'function' ? children(close) : children}
                </div>
            )}
        </div>
    );
}

/**
 * A centred dialog over a dimmed backdrop. Esc and clicking the backdrop close it unless
 * `dismissable` is false (e.g. while an export is running).
 */
export function Modal({
    onClose,
    dismissable = true,
    className,
    children,
    ...rest
}: {
    onClose: () => void;
    dismissable?: boolean;
    className?: string;
    children: ReactNode;
} & Record<`data-${string}`, unknown>) {
    const closeRef = useRef(onClose);
    closeRef.current = onClose;
    const dismissRef = useRef(dismissable);
    dismissRef.current = dismissable;
    const dialogRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const opener = document.activeElement as HTMLElement | null;
        dialogRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            const dialog = dialogRef.current;
            if (event.key === 'Tab' && dialog) {
                // Keep keyboard focus inside the dialog instead of the editor behind it.
                const items = [...dialog.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter(
                    (el) => !el.hasAttribute('disabled')
                );
                const [first, last] = [items[0], items[items.length - 1]];
                const at = document.activeElement;
                if (!first) event.preventDefault();
                else if (event.shiftKey && (at === first || at === dialog)) (event.preventDefault(), last.focus());
                else if (!event.shiftKey && at === last) (event.preventDefault(), first.focus());
                return;
            }
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            if (dismissRef.current) closeRef.current();
        };
        window.addEventListener('keydown', onKey, true);
        return () => {
            window.removeEventListener('keydown', onKey, true);
            opener?.focus?.();
        };
    }, []);
    return (
        <div
            className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm'
            onPointerDown={(e) => e.target === e.currentTarget && dismissable && onClose()}
            {...rest}
        >
            <div
                ref={dialogRef}
                tabIndex={-1}
                className={cx('max-h-full w-full overflow-hidden rounded-2xl border border-line bg-panel shadow-panel outline-none', className)}
                role='dialog'
                aria-modal
            >
                {children}
            </div>
        </div>
    );
}

/** A thin progress bar, 0 to 1, with an optional percentage. */
export function ProgressBar({ value, showValue = true }: { value: number; showValue?: boolean }) {
    const percent = Math.round(Math.min(1, Math.max(0, value)) * 100);
    return (
        <div className='flex items-center gap-2'>
            <div className='h-1.5 flex-1 overflow-hidden rounded-full bg-line'>
                <div className='h-full rounded-full bg-accent transition-[width] duration-300' style={{ width: `${percent}%` }} />
            </div>
            {showValue && <span className='w-9 text-right font-mono text-xs text-muted'>{percent}%</span>}
        </div>
    );
}

/** A real checkbox with a visible label; use instead of a hand-built role='checkbox'. */
export function Checkbox({
    checked,
    onChange,
    label,
    disabled,
    className,
}: {
    checked: boolean;
    onChange: (value: boolean) => void;
    label?: ReactNode;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <label className={cx('flex cursor-default items-center gap-2', disabled && 'opacity-40', className)}>
            <input
                type='checkbox'
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className='h-4 w-4 shrink-0 accent-[var(--accent)]'
            />
            {label}
        </label>
    );
}

/** One-of-many as a stacked list; for 3-4 options whose labels are too long for Segmented. */
export function RadioList<T extends string>({
    value,
    options,
    onChange,
    label,
}: {
    value: T;
    options: { value: T; label: string; hint?: string }[];
    onChange: (value: T) => void;
    label: string;
}) {
    return (
        <div role='radiogroup' aria-label={label} className='space-y-1'>
            {options.map((o) => (
                <label
                    key={o.value}
                    className={cx(
                        'flex cursor-default items-start gap-2 rounded-lg border px-3 py-2 transition-colors',
                        o.value === value ? 'border-accent bg-panel-2' : 'border-line hover:border-line-strong'
                    )}
                >
                    <input
                        type='radio'
                        name={label}
                        checked={o.value === value}
                        onChange={() => onChange(o.value)}
                        className='mt-0.5 h-3.5 w-3.5 shrink-0 accent-[var(--accent)]'
                    />
                    <span className='min-w-0'>
                        <span className='block text-sm text-fg'>{o.label}</span>
                        {o.hint && <span className='block text-xs text-muted'>{o.hint}</span>}
                    </span>
                </label>
            ))}
        </div>
    );
}

/** A pressed/unpressed format button (Bold, Italic). */
export function ToggleButton({
    pressed,
    onChange,
    label,
    children,
}: {
    pressed: boolean;
    onChange: (value: boolean) => void;
    label: string;
    children: ReactNode;
}) {
    return (
        <button
            aria-pressed={pressed}
            aria-label={label}
            title={label}
            onClick={() => onChange(!pressed)}
            className={cx(
                'h-8 w-8 rounded-lg border text-sm font-bold transition-colors',
                pressed ? 'border-accent bg-accent text-accent-fg' : 'border-line bg-panel-2 text-muted hover:text-fg'
            )}
        >
            {children}
        </button>
    );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Colour well plus a hex field so a brand colour can be pasted. */
export function ColorField({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
    const [draft, setDraft] = useState<string | null>(null);
    return (
        <span className='inline-flex items-center gap-1.5'>
            <input
                type='color'
                value={HEX.test(value) ? value : '#000000'}
                onChange={(e) => onChange(e.target.value)}
                aria-label={`${label} color`}
                className='h-7 w-9 cursor-pointer rounded border border-line bg-transparent'
            />
            <input
                value={draft ?? value}
                onChange={(e) => {
                    const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`;
                    setDraft(v);
                    if (HEX.test(v)) onChange(v.toLowerCase());
                }}
                onBlur={() => setDraft(null)}
                aria-label={`${label} hex`}
                spellCheck={false}
                maxLength={7}
                className='h-7 w-[4.5rem] rounded border border-line bg-panel-2 px-1.5 font-mono text-xs text-fg outline-none focus:border-accent'
            />
        </span>
    );
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
const parseTime = (text: string) => {
    const [a, b] = text.trim().split(':');
    const value = b === undefined ? Number(a) : Number(a) * 60 + Number(b);
    return Number.isFinite(value) ? value : null;
};

/** A typed time field (m:ss.s or plain seconds); commits on blur/Enter, reverts when invalid. */
export function TimeField({
    value,
    onChange,
    min = 0,
    max = Infinity,
    label,
}: {
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    label: string;
}) {
    const [draft, setDraft] = useState<string | null>(null);
    const commit = () => {
        const parsed = draft === null ? null : parseTime(draft);
        if (parsed !== null) onChange(Math.min(max, Math.max(min, parsed)));
        setDraft(null);
    };
    return (
        <input
            value={draft ?? formatTime(value)}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            aria-label={label}
            title='Type a time, like 1:05.5 or 12'
            className='h-7 w-16 rounded border border-line bg-panel-2 px-1.5 text-right font-mono text-xs text-fg outline-none focus:border-accent'
        />
    );
}

/** Font choice where every option is drawn in its own face. */
export function FontPicker<T extends string>({
    value,
    fonts,
    onChange,
    label,
}: {
    value: T;
    fonts: { value: T; label: string; stack: string }[];
    onChange: (value: T) => void;
    label: string;
}) {
    const current = fonts.find((f) => f.value === value);
    return (
        <Popover
            trigger={(open, toggle) => (
                <button
                    aria-haspopup='listbox'
                    aria-expanded={open}
                    aria-label={`${label}: ${current?.label ?? ''}`}
                    onClick={toggle}
                    className='flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 text-sm text-fg hover:border-line-strong'
                    style={{ fontFamily: current?.stack }}
                >
                    {current?.label}
                    <span aria-hidden className='text-muted'>
                        ▾
                    </span>
                </button>
            )}
        >
            {(close) => (
                <div role='listbox' aria-label={label} className='max-h-72 overflow-y-auto'>
                    {fonts.map((f) => (
                        <button
                            key={f.value}
                            role='option'
                            aria-selected={f.value === value}
                            onClick={() => {
                                onChange(f.value);
                                close();
                            }}
                            className={cx(
                                'block w-full rounded-lg px-3 py-1.5 text-left text-base hover:bg-panel-2',
                                f.value === value ? 'text-accent' : 'text-fg'
                            )}
                            style={{ fontFamily: f.stack }}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>
            )}
        </Popover>
    );
}

/** Drag a dot on a 16:9 pad to set an x/y point (0 to 1); arrow keys nudge it. */
export function PositionPad({ x, y, onChange, label }: { x: number; y: number; onChange: (x: number, y: number) => void; label: string }) {
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const move = (event: React.PointerEvent<HTMLDivElement>) => {
        const box = event.currentTarget.getBoundingClientRect();
        onChange(clamp((event.clientX - box.left) / box.width), clamp((event.clientY - box.top) / box.height));
    };
    return (
        <div
            role='group'
            tabIndex={0}
            aria-label={`${label}: ${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
            className='relative aspect-video w-full touch-none rounded-lg border border-line bg-panel-2 outline-none focus-visible:border-accent'
            onPointerDown={(e) => (e.currentTarget.setPointerCapture(e.pointerId), move(e))}
            onPointerMove={(e) => e.buttons === 1 && move(e)}
            onKeyDown={(e) => {
                const d = e.shiftKey ? 0.1 : 0.02;
                const dx = e.key === 'ArrowRight' ? d : e.key === 'ArrowLeft' ? -d : 0;
                const dy = e.key === 'ArrowDown' ? d : e.key === 'ArrowUp' ? -d : 0;
                if (!dx && !dy) return;
                e.preventDefault();
                onChange(clamp(x + dx), clamp(y + dy));
            }}
        >
            <span
                aria-hidden
                className='absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow'
                style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            />
        </div>
    );
}

/** A button that opens a menu of commands; unlike a <select> it never holds a value. */
export function MenuButton({
    label,
    items,
    onPick,
    className,
}: {
    label: ReactNode;
    items: { key: string; label: ReactNode; hint?: string }[];
    onPick: (key: string) => void;
    className?: string;
}) {
    return (
        <Popover
            trigger={(open, toggle) => (
                <button
                    aria-haspopup='menu'
                    aria-expanded={open}
                    onClick={toggle}
                    className={cx(
                        'flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-line bg-panel-2 px-3 text-xs text-fg hover:border-line-strong',
                        className
                    )}
                >
                    {label}
                    <span aria-hidden className='text-muted'>
                        ▾
                    </span>
                </button>
            )}
        >
            {(close) => (
                <div role='menu' className='max-h-72 overflow-y-auto'>
                    {items.map((item) => (
                        <button
                            key={item.key}
                            role='menuitem'
                            onClick={() => {
                                onPick(item.key);
                                close();
                            }}
                            className='block w-full rounded-lg px-3 py-1.5 text-left hover:bg-panel-2'
                        >
                            <span className='block text-sm text-fg'>{item.label}</span>
                            {item.hint && <span className='block text-xs text-muted'>{item.hint}</span>}
                        </button>
                    ))}
                </div>
            )}
        </Popover>
    );
}

export { cx };
