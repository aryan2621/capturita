import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type CSSProperties,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent as RKeyboardEvent,
  type PointerEvent as RPointerEvent,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { createPortal } from 'react-dom'

/* If your project already has a `cx` helper, import it here and delete this one. */
export const cx = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ shared styles */
const focus =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg/50'
const fieldBase =
  'rounded-xl border border-line-strong bg-bg text-fg transition-colors hover:border-fg/30'
const fieldRing =
  'focus-within:border-fg/50 focus-within:ring-[3px] focus-within:ring-fg/10'
const popSurface =
  'z-50 rounded-2xl border border-line bg-raised p-1.5 text-fg shadow-lg shadow-black/10'
const menuRow =
  'flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-fg/5 ' +
  focus
/** Reuse in TooltipLayer.tsx so the global tooltip matches. */
export const tooltipSurface =
  'pointer-events-none z-50 whitespace-nowrap rounded-lg bg-fg px-2 py-1 text-xs font-medium text-bg'

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))

function Chevron({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m4 6 4 4 4-4" />
    </svg>
  )
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  )
}

/* ================================================================== A. EXISTING */

export type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger' | 'record'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const variantCls: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent-hover',
  secondary: 'border border-line-strong bg-bg text-fg hover:bg-fg/5',
  ghost: 'text-fg hover:bg-fg/5 active:bg-fg/10',
  subtle: 'bg-panel-2 text-fg hover:bg-fg/10',
  danger: 'bg-danger text-white hover:opacity-90',
  record: 'bg-record text-white hover:bg-record-hover',
}
const sizeCls: Record<ButtonSize, string> = {
  sm: 'h-8 rounded-lg px-3 text-[13px]',
  md: 'h-9 rounded-xl px-3.5 text-sm',
  lg: 'h-11 rounded-full px-5 text-sm',
  icon: 'size-9 rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: ButtonSize
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-40',
        focus,
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...props}
    />
  )
})

export interface IconButtonProps extends Omit<ButtonProps, 'size' | 'children'> {
  label: string
  size?: 'icon' | 'icon-sm'
  children: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'icon', children, ...props },
  ref,
) {
  return (
    <Button ref={ref} variant={variant} size={size} aria-label={label} title={label} {...props}>
      {children}
    </Button>
  )
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...props },
  ref,
) {
  return (
    <div className="relative w-full">
      <select
        ref={ref}
        className={cx(
          fieldBase,
          'h-9 w-full appearance-none pl-3 pr-8 text-sm outline-none focus-visible:border-fg/50 focus-visible:ring-[3px] focus-visible:ring-fg/10 disabled:opacity-40',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Chevron className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  )
})

export function Switch({
  checked,
  onChange,
  disabled,
  label,
  className,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  disabled?: boolean
  label: string
  className?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={`${label}: ${checked ? 'on' : 'off'}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative h-5 w-9 shrink-0 rounded-full transition-colors before:absolute before:-inset-2 before:content-[''] disabled:opacity-40",
        checked ? 'bg-accent' : 'bg-fg/20',
        focus,
        className,
      )}
    >
      <span
        className={cx(
          'absolute left-0.5 top-0.5 size-4 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-4 bg-accent-fg' : 'bg-white',
        )}
      />
    </button>
  )
}

export interface SegmentedOption<T> {
  value: T
  label?: string
  icon?: ReactNode
  hint?: string
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  size = 'md',
  label,
  className,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  label?: string
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ left: number; width: number } | null>(null)
  const idx = Math.max(0, options.findIndex((o) => o.value === value))

  const measure = useCallback(() => {
    // children[0] is the sliding indicator, options start at 1
    const el = root.current?.children[idx + 1] as HTMLElement | undefined
    if (el) setBox({ left: el.offsetLeft, width: el.offsetWidth })
  }, [idx])

  useLayoutEffect(measure, [measure, options.length])
  useEffect(() => {
    const r = root.current
    if (!r || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(measure)
    ro.observe(r)
    return () => ro.disconnect()
  }, [measure])

  const onKey = (e: RKeyboardEvent<HTMLButtonElement>) => {
    const n = options.length
    let next = idx
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (idx + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (idx - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else return
    e.preventDefault()
    onChange(options[next].value)
    ;(root.current?.children[next + 1] as HTMLElement | undefined)?.focus()
  }

  return (
    <div
      ref={root}
      role="radiogroup"
      aria-label={label}
      className={cx(
        'relative grid auto-cols-fr grid-flow-col rounded-xl bg-panel-2 p-0.5',
        size === 'sm' ? 'h-8' : 'h-9',
        className,
      )}
    >
      <span
        aria-hidden
        className={cx(
          'absolute bottom-0.5 top-0.5 rounded-[10px] bg-raised shadow-sm transition-[left,width] duration-200 motion-reduce:transition-none',
          box ? 'opacity-100' : 'opacity-0',
        )}
        style={box ?? undefined}
      />
      {options.map((o, i) => {
        const active = i === idx
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={o.label ?? o.hint ?? String(o.value)}
            title={o.hint}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={onKey}
            className={cx(
              'relative z-10 inline-flex items-center justify-center gap-1.5 rounded-[10px] px-3 text-[13px] font-medium transition-colors',
              focus,
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export interface RangeInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'min' | 'max'> {
  value: number
  min: number
  max: number
}

export function RangeInput({ value, min, max, className, style, ...props }: RangeInputProps) {
  const pct = max > min ? clamp(((value - min) / (max - min)) * 100, 0, 100) : 0
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      className={cx('slider', className)}
      style={{ ...style, '--fill': `${pct}%` } as CSSProperties}
      {...props}
    />
  )
}

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
  className,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format: (value: number) => string
  onChange: (value: number) => void
  disabled?: boolean
  field?: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-1', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <label htmlFor={id} className="text-fg">
          {label}
        </label>
        {field ?? <span className="font-mono text-xs tabular-nums text-muted">{format(value)}</span>}
      </div>
      <RangeInput
        id={id}
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  )
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-line-strong bg-panel px-1.5 font-mono text-[11px] text-muted',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Popover({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  className,
}: {
  trigger: (open: boolean, toggle: () => void) => ReactNode
  children: ReactNode | ((close: () => void) => ReactNode)
  align?: 'start' | 'end' | 'center'
  side?: 'top' | 'bottom'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  const toggle = useCallback(() => setOpen((o) => !o), [])

  useEffect(() => {
    if (!open) return
    const down = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [open, close])

  return (
    <div ref={ref} className="relative inline-flex">
      {trigger(open, toggle)}
      {open && (
        <div
          className={cx(
            'absolute min-w-48',
            popSurface,
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
            align === 'start' && 'left-0',
            align === 'end' && 'right-0',
            align === 'center' && 'left-1/2 -translate-x-1/2',
            className,
          )}
        >
          {typeof children === 'function' ? children(close) : children}
        </div>
      )}
    </div>
  )
}

export interface ModalProps extends Omit<HTMLAttributes<HTMLDivElement>, 'className' | 'children'> {
  onClose: () => void
  dismissable?: boolean
  className?: string
  children: ReactNode
}

export function Modal({ onClose, dismissable = true, className, children, ...rest }: ModalProps) {
  const card = useRef<HTMLDivElement>(null)
  useEffect(() => {
    card.current?.focus()
    if (!dismissable) return
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [dismissable, onClose])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (dismissable && e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cx(
          'max-h-[90vh] w-full overflow-auto rounded-lg border border-line bg-raised text-fg shadow-xl outline-none',
          !className?.includes('max-w-') && 'max-w-lg',
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    </div>
  )
}

export function ProgressBar({
  value,
  showValue = true,
  className,
}: {
  value: number
  showValue?: boolean
  className?: string
}) {
  const v = clamp(value, 0, 1)
  return (
    <div className={cx('flex items-center gap-3', className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-fg/10"
      >
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${v * 100}%` }} />
      </div>
      {showValue && <span className="w-9 text-right font-mono text-xs tabular-nums text-muted">{Math.round(v * 100)}%</span>}
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <label className={cx('flex cursor-pointer items-start gap-2.5 text-sm', disabled && 'pointer-events-none opacity-40', className)}>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      <span className="mt-px grid size-4 shrink-0 place-items-center rounded-[5px] border border-line-strong bg-bg text-accent-fg transition-colors peer-checked:border-accent peer-checked:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg/50 peer-checked:[&>svg]:opacity-100">
        <CheckIcon className="size-3 opacity-0" />
      </span>
      <span className="text-fg">{label}</span>
    </label>
  )
}

export function RadioList<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const name = useId()
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex flex-col gap-1', className)}>
      {options.map((o) => (
        <label key={o.value} className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors hover:bg-fg/5">
          <input type="radio" name={name} className="peer sr-only" checked={o.value === value} onChange={() => onChange(o.value)} />
          <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-line-strong bg-bg transition-colors peer-checked:border-accent peer-checked:[&>span]:scale-100 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-fg/50">
            <span className="size-2 scale-0 rounded-full bg-accent transition-transform" />
          </span>
          <span className="flex flex-col">
            <span className="text-fg">{o.label}</span>
            {o.hint && <span className="text-xs text-muted">{o.hint}</span>}
          </span>
        </label>
      ))}
    </div>
  )
}

export function ToggleButton({
  pressed,
  onChange,
  label,
  children,
  className,
}: {
  pressed: boolean
  onChange: (value: boolean) => void
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      onClick={() => onChange(!pressed)}
      className={cx(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors',
        focus,
        pressed ? 'border-accent bg-accent text-accent-fg' : 'border-line-strong bg-bg text-fg hover:bg-fg/5',
        className,
      )}
    >
      {children}
    </button>
  )
}

const HEX = /^#[0-9a-f]{6}$/i

export function ColorField({
  value,
  onChange,
  label,
  className,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <div className={cx(fieldBase, fieldRing, 'flex h-9 items-center gap-2 px-2', className)}>
      <input
        type="color"
        aria-label={`${label} picker`}
        value={HEX.test(value) ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="size-6 shrink-0 cursor-pointer appearance-none rounded-md border border-line-strong bg-transparent p-0 [&::-moz-color-swatch]:rounded-md [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
      />
      <input
        aria-label={label}
        value={draft}
        spellCheck={false}
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value
          setDraft(v)
          if (HEX.test(v)) onChange(v.toLowerCase())
        }}
        onBlur={() => setDraft(value)}
        className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase outline-none"
      />
    </div>
  )
}

const fmtTime = (v: number) => {
  const t = Math.round(Math.max(0, v) * 1000)
  const m = Math.floor(t / 60000)
  const s = Math.floor((t % 60000) / 1000)
  return `${m}:${String(s).padStart(2, '0')}.${String(t % 1000).padStart(3, '0')}`
}
const parseTime = (raw: string): number | null => {
  const s = raw.trim()
  if (!s) return null
  const parts = s.split(':')
  if (parts.length > 2) return null
  const n = parts.map(Number)
  if (n.some((x) => !Number.isFinite(x))) return null
  return parts.length === 2 ? n[0] * 60 + n[1] : n[0]
}

export function TimeField({
  value,
  onChange,
  min = 0,
  max = Infinity,
  label,
  className,
}: {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
  className?: string
}) {
  const [draft, setDraft] = useState(fmtTime(value))
  const editing = useRef(false)
  useEffect(() => {
    if (!editing.current) setDraft(fmtTime(value))
  }, [value])

  const commit = () => {
    editing.current = false
    const p = parseTime(draft)
    if (p == null) return setDraft(fmtTime(value))
    const next = clamp(p, min, max)
    onChange(next)
    setDraft(fmtTime(next))
  }

  return (
    <input
      aria-label={label}
      value={draft}
      spellCheck={false}
      inputMode="decimal"
      onFocus={() => (editing.current = true)}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          setDraft(fmtTime(value))
          editing.current = false
          e.currentTarget.blur()
        }
      }}
      className={cx(
        fieldBase,
        'h-8 w-24 px-2 text-right font-mono text-xs tabular-nums outline-none focus-visible:border-fg/50 focus-visible:ring-[3px] focus-visible:ring-fg/10',
        className,
      )}
    />
  )
}

export function FontPicker<T extends string>({
  value,
  fonts,
  onChange,
  label,
  className,
}: {
  value: T
  fonts: { value: T; label: string; stack: string }[]
  onChange: (value: T) => void
  label: string
  className?: string
}) {
  const current = fonts.find((f) => f.value === value) ?? fonts[0]
  return (
    <Popover
      className={cx('max-h-72 w-full overflow-auto', className)}
      trigger={(open, toggle) => (
        <button
          type="button"
          aria-label={label}
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={toggle}
          className={cx(fieldBase, 'flex h-9 w-56 items-center justify-between gap-2 px-3 text-sm', focus)}
          style={{ fontFamily: current?.stack }}
        >
          <span className="truncate">{current?.label}</span>
          <Chevron className="size-4 shrink-0 text-muted" />
        </button>
      )}
    >
      {(close) => (
        <div role="listbox" aria-label={label}>
          {fonts.map((f) => (
            <button
              key={f.value}
              type="button"
              role="option"
              aria-selected={f.value === value}
              onClick={() => {
                onChange(f.value)
                close()
              }}
              className={menuRow}
              style={{ fontFamily: f.stack }}
            >
              <span className="truncate">{f.label}</span>
              {f.value === value && <CheckIcon className="size-4 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}

export function PositionPad({
  x,
  y,
  onChange,
  label,
  className,
}: {
  x: number
  y: number
  onChange: (x: number, y: number) => void
  label: string
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const set = (e: RPointerEvent<HTMLDivElement>) => {
    const r = ref.current?.getBoundingClientRect()
    if (!r) return
    onChange(clamp((e.clientX - r.left) / r.width, 0, 1), clamp((e.clientY - r.top) / r.height, 0, 1))
  }
  const onKey = (e: RKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 0.1 : 0.02
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const m = d[e.key]
    if (!m) return
    e.preventDefault()
    onChange(clamp(x + m[0], 0, 1), clamp(y + m[1], 0, 1))
  }
  return (
    <div
      ref={ref}
      role="group"
      tabIndex={0}
      aria-label={`${label}: ${Math.round(x * 100)}% across, ${Math.round(y * 100)}% down`}
      onKeyDown={onKey}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        set(e)
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) set(e)
      }}
      className={cx(
        'relative aspect-square w-full max-w-44 touch-none cursor-crosshair rounded-xl border border-line-strong bg-panel-2',
        focus,
        className,
      )}
    >
      <span aria-hidden className="absolute left-1/2 top-0 h-full w-px bg-line" />
      <span aria-hidden className="absolute left-0 top-1/2 h-px w-full bg-line" />
      <span
        aria-hidden
        className="absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-bg shadow-sm"
        style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      />
    </div>
  )
}

export function MenuButton({
  label,
  items,
  onPick,
  className,
  size,
}: {
  label: ReactNode
  items: { key: string; label: ReactNode; hint?: string }[]
  onPick: (key: string) => void
  className?: string
  size?: 'sm'
}) {
  return (
    <Popover
      trigger={(open, toggle) => (
        <Button variant="secondary" size={size} className={className} aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
          {label}
          <Chevron className="size-4 text-muted" />
        </Button>
      )}
    >
      {(close) => (
        <div role="menu">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              role="menuitem"
              onClick={() => {
                onPick(it.key)
                close()
              }}
              className={menuRow}
            >
              <span>{it.label}</span>
              {it.hint && <span className="text-xs text-subtle">{it.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </Popover>
  )
}

/* ================================================================== B. NEW */

export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md'
  invalid?: boolean
  leading?: ReactNode
  trailing?: ReactNode
}

/** `className` applies to the outer field wrapper; everything else goes to the <input>. */
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { size = 'md', invalid, leading, trailing, className, ...props },
  ref,
) {
  return (
    <div
      className={cx(
        fieldBase,
        fieldRing,
        'flex w-full items-center gap-2 px-3',
        size === 'sm' ? 'h-8' : 'h-9',
        invalid && 'border-danger hover:border-danger focus-within:border-danger focus-within:ring-danger/20',
        props.disabled && 'opacity-40',
        className,
      )}
    >
      {leading && <span className="shrink-0 text-muted">{leading}</span>}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
        {...props}
      />
      {trailing && <span className="shrink-0 text-muted">{trailing}</span>}
    </div>
  )
})

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
  autoGrow?: boolean
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(function TextArea(
  { rows = 3, invalid, autoGrow, className, onInput, value, ...props },
  ref,
) {
  const inner = useRef<HTMLTextAreaElement | null>(null)
  const grow = useCallback(() => {
    const el = inner.current
    if (!autoGrow || !el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [autoGrow])
  useLayoutEffect(grow, [grow, value])
  return (
    <textarea
      ref={(el) => {
        inner.current = el
        if (typeof ref === 'function') ref(el)
        else if (ref) ref.current = el
      }}
      rows={rows}
      value={value}
      aria-invalid={invalid || undefined}
      onInput={(e) => {
        grow()
        onInput?.(e)
      }}
      className={cx(
        fieldBase,
        'w-full resize-y px-3 py-2 text-sm outline-none placeholder:text-subtle focus-visible:border-fg/50 focus-visible:ring-[3px] focus-visible:ring-fg/10 disabled:opacity-40',
        autoGrow && 'resize-none overflow-hidden',
        invalid && 'border-danger hover:border-danger focus-visible:border-danger focus-visible:ring-danger/20',
        className,
      )}
      {...props}
    />
  )
})

export function Field({
  label,
  hint,
  error,
  htmlFor,
  children,
  className,
}: {
  label: ReactNode
  hint?: ReactNode
  error?: ReactNode
  htmlFor?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-danger-fg">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  )
}

export function SettingRow({
  title,
  description,
  control,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  control: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-center justify-between gap-6 py-3', className)}>
      <div className="min-w-0">
        <div className="text-sm text-fg">{title}</div>
        {description && <div className="mt-0.5 text-xs text-muted">{description}</div>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  )
}

export function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex items-start justify-between gap-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-fg">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md'
  interactive?: boolean
  selected?: boolean
}

export function Card({ padding = 'md', interactive, selected, className, onKeyDown, ...props }: CardProps) {
  return (
    <div
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        if (interactive && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          e.currentTarget.click()
        }
      }}
      className={cx(
        'rounded-2xl border bg-bg text-fg transition-colors',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-4',
        selected ? 'border-accent ring-1 ring-accent' : 'border-line',
        interactive && 'cursor-pointer hover:bg-fg/5 active:bg-fg/10',
        interactive && focus,
        className,
      )}
      {...props}
    />
  )
}

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger'
const badgeCls: Record<BadgeTone, string> = {
  neutral: 'bg-fg/8 text-muted',
  accent: 'bg-accent text-accent-fg',
  success: 'bg-success-soft text-success-fg',
  warning: 'bg-warning-soft text-warning-fg',
  danger: 'bg-danger-soft text-danger-fg',
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone
  children: ReactNode
  className?: string
}) {
  return (
    <span className={cx('inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium', badgeCls[tone], className)}>
      {children}
    </span>
  )
}

export function Tooltip({
  content,
  side = 'top',
  children,
}: {
  content: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactElement
}) {
  const pos = {
    top: 'bottom-full left-1/2 mb-1.5 -translate-x-1/2',
    bottom: 'top-full left-1/2 mt-1.5 -translate-x-1/2',
    left: 'right-full top-1/2 mr-1.5 -translate-y-1/2',
    right: 'left-full top-1/2 ml-1.5 -translate-y-1/2',
  }[side]
  return (
    <span className="group/tip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cx(
          'absolute opacity-0 transition-opacity delay-300 group-focus-within/tip:opacity-100 group-hover/tip:opacity-100',
          tooltipSurface,
          pos,
        )}
      >
        {content}
      </span>
    </span>
  )
}

export function Tabs({
  value,
  onChange,
  items,
  className,
}: {
  value: string
  onChange: (value: string) => void
  items: { value: string; label: string; icon?: ReactNode; badge?: ReactNode }[]
  className?: string
}) {
  const root = useRef<HTMLDivElement>(null)
  const idx = Math.max(0, items.findIndex((i) => i.value === value))
  const onKey = (e: RKeyboardEvent<HTMLButtonElement>) => {
    const n = items.length
    let next = idx
    if (e.key === 'ArrowRight') next = (idx + 1) % n
    else if (e.key === 'ArrowLeft') next = (idx - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else return
    e.preventDefault()
    onChange(items[next].value)
    ;(root.current?.children[next] as HTMLElement | undefined)?.focus()
  }
  return (
    <div ref={root} role="tablist" className={cx('flex gap-1 overflow-x-auto', className)}>
      {items.map((it, i) => {
        const active = i === idx
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(it.value)}
            onKeyDown={onKey}
            className={cx(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors',
              focus,
              active ? 'bg-fg/8 font-medium text-fg' : 'text-muted hover:bg-fg/5 hover:text-fg',
            )}
          >
            {it.icon}
            {it.label}
            {it.badge}
          </button>
        )
      })}
    </div>
  )
}

/* ---- Toast ---- */
export type ToastTone = 'neutral' | 'success' | 'warning' | 'danger'
export interface ToastOptions {
  message: string
  description?: string
  tone?: ToastTone
  action?: { label: string; onClick: () => void }
  /** ms; 0 keeps it until dismissed. Errors default longer. */
  duration?: number
}
interface ToastApi {
  show: (t: ToastOptions) => number
  dismiss: (id: number) => void
}
const ToastCtx = createContext<ToastApi | null>(null)
const MAX_TOASTS = 3
const toastCls: Record<ToastTone, string> = {
  neutral: 'bg-fg text-bg',
  success: 'bg-success text-white',
  warning: 'bg-warning text-black',
  danger: 'bg-danger text-white',
}
// Lets non-component code (lib/toast.ts) reach the mounted provider.
let activeToast: ToastApi | null = null
export const toastApi = {
  show: (t: ToastOptions) => activeToast?.show(t) ?? -1,
  dismiss: (id: number) => activeToast?.dismiss(id),
}

function ToastItem({ t, onDone }: { t: ToastOptions & { id: number }; onDone: (id: number) => void }) {
  const tone = t.tone ?? 'neutral'
  const duration = t.duration ?? (tone === 'danger' ? 8000 : 4000)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (duration <= 0 || paused) return
    const h = window.setTimeout(() => onDone(t.id), duration)
    return () => window.clearTimeout(h)
  }, [duration, paused, onDone, t.id])
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className={cx('pointer-events-auto flex max-w-md items-center gap-3 rounded-2xl px-4 py-2 text-sm font-medium shadow-lg shadow-black/15', toastCls[tone])}
    >
      <span className="min-w-0">
        {t.message}
        {t.description && <span className="mt-0.5 block text-xs font-normal opacity-80">{t.description}</span>}
      </span>
      {t.action && (
        <button
          type="button"
          onClick={() => {
            t.action?.onClick()
            onDone(t.id)
          }}
          className={cx('shrink-0 rounded underline underline-offset-2', focus)}
        >
          {t.action.label}
        </button>
      )}
    </div>
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Array<ToastOptions & { id: number }>>([])
  const next = useRef(0)
  const dismiss = useCallback((id: number) => setItems((l) => l.filter((t) => t.id !== id)), [])
  const show = useCallback((t: ToastOptions) => {
    const id = ++next.current
    setItems((l) => [...l, { ...t, id }].slice(-MAX_TOASTS))
    return id
  }, [])
  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])
  useEffect(() => {
    activeToast = api
    return () => {
      if (activeToast === api) activeToast = null
    }
  }, [api])
  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[60] flex flex-col items-end gap-2">
          {items.map((t) => (
            <ToastItem key={t.id} t={t} onDone={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastCtx)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg role="status" aria-label="Loading" width={size} height={size} viewBox="0 0 24 24" fill="none" className={cx('animate-spin motion-reduce:animate-pulse', className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cx('flex flex-col items-center gap-2 px-6 py-10 text-center', className)}>
      {icon && <div className="mb-1 grid size-10 place-items-center rounded-full bg-panel-2 text-muted">{icon}</div>}
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      {description && <p className="max-w-xs text-sm text-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}

export function Divider({
  orientation = 'horizontal',
  className,
}: {
  orientation?: 'horizontal' | 'vertical'
  className?: string
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cx('shrink-0 bg-line', orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px self-stretch', className)}
    />
  )
}

export function ListItem({
  leading,
  title,
  subtitle,
  trailing,
  selected,
  onClick,
  className,
}: {
  leading?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  trailing?: ReactNode
  selected?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-current={selected || undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
      className={cx(
        'flex min-h-10 items-center gap-3 rounded-xl px-2.5 py-2 transition-colors',
        onClick && 'cursor-pointer',
        onClick && focus,
        selected ? 'bg-fg/8' : onClick && 'hover:bg-fg/5',
        className,
      )}
    >
      {leading && <span className="shrink-0 text-muted">{leading}</span>}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-fg">{title}</span>
        {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
      </span>
      {trailing && <span className="shrink-0 text-muted">{trailing}</span>}
    </div>
  )
}

export function SidebarItem({
  icon,
  label,
  active,
  onClick,
  trailing,
  className,
}: {
  icon?: ReactNode
  label: string
  active?: boolean
  onClick: () => void
  trailing?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-sm transition-colors',
        focus,
        active ? 'bg-fg/8 text-fg' : 'text-fg hover:bg-fg/5',
        className,
      )}
    >
      {icon && <span className="shrink-0 text-muted">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {trailing && <span className="shrink-0 text-muted">{trailing}</span>}
    </button>
  )
}
