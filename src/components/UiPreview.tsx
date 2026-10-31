import { useState, type ReactNode } from 'react'
import {
  Badge, Button, Card, Checkbox, ColorField, Divider, EmptyState, Field, FontPicker, IconButton,
  Kbd, ListItem, MenuButton, Modal, PositionPad, Popover, ProgressBar, RadioList, RangeInput,
  SectionHeader, Segmented, Select, SettingRow, SidebarItem, Slider, Spinner, Switch, Tabs,
  TextArea, TextInput, TimeField, ToastProvider, ToggleButton, Tooltip, useToast,
  type Variant,
} from './ui'

const VARIANTS: Variant[] = ['primary', 'secondary', 'ghost', 'subtle', 'danger', 'record']
const FONTS = [
  { value: 'sys', label: 'System UI', stack: 'ui-sans-serif, system-ui, sans-serif' },
  { value: 'serif', label: 'Georgia', stack: 'Georgia, serif' },
  { value: 'mono', label: 'Monospace', stack: 'ui-monospace, Menlo, monospace' },
]
const Plus = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
    <path d="M8 3v10M3 8h10" />
  </svg>
)
const Dot = () => <span className="size-2 rounded-full bg-current" />

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xs font-medium text-subtle">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  )
}

function ToastDemo() {
  const { show } = useToast()
  return (
    <>
      <Button onClick={() => show({ message: 'Export finished' })}>Neutral toast</Button>
      <Button onClick={() => show({ message: 'Saved to Library', tone: 'success', action: { label: 'Undo', onClick: () => {} } })}>Success + action</Button>
      <Button onClick={() => show({ message: 'Could not read the file', tone: 'danger' })}>Danger toast</Button>
    </>
  )
}

function Gallery() {
  const [on, setOn] = useState(true)
  const [seg, setSeg] = useState('fit')
  const [n, setN] = useState(40)
  const [check, setCheck] = useState(true)
  const [radio, setRadio] = useState('mp4')
  const [pressed, setPressed] = useState(false)
  const [color, setColor] = useState('#3b82f6')
  const [time, setTime] = useState(12.5)
  const [font, setFont] = useState('sys')
  const [pos, setPos] = useState({ x: 0.5, y: 0.5 })
  const [tab, setTab] = useState('look')
  const [side, setSide] = useState('record')
  const [modal, setModal] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      <Group title="Button variants">
        {VARIANTS.map((v) => <Button key={v} variant={v}>{v}</Button>)}
        <Button variant="primary" disabled>disabled</Button>
      </Group>
      <Group title="Button sizes + IconButton">
        <Button size="sm">sm 32</Button>
        <Button size="md">md 36</Button>
        <Button size="lg" variant="primary">lg 44</Button>
        <IconButton label="Add"><Plus /></IconButton>
        <IconButton label="Add small" size="icon-sm" variant="subtle"><Plus /></IconButton>
      </Group>
      <Group title="Inputs">
        <div className="grid w-full max-w-md gap-4">
          <Field label="Project name" hint="Shown in the Library.">
            <TextInput placeholder="Untitled recording" leading={<Plus />} />
          </Field>
          <Field label="Email" error="Enter a valid email address.">
            <TextInput invalid defaultValue="name@" />
          </Field>
          <TextInput size="sm" placeholder="Small, with trailing" trailing={<Kbd>⌘K</Kbd>} />
          <TextArea autoGrow placeholder="Notes (grows as you type)" />
          <Select defaultValue="1080"><option value="720">720p</option><option value="1080">1080p</option><option value="4k">4K</option></Select>
        </div>
      </Group>
      <Group title="Switch, Checkbox, RadioList, ToggleButton">
        <Switch label="Cursor highlight" checked={on} onChange={setOn} />
        <Switch label="Disabled" checked={false} onChange={() => {}} disabled />
        <Checkbox label="Remember this choice" checked={check} onChange={setCheck} />
        <ToggleButton label="Bold" pressed={pressed} onChange={setPressed}><b>B</b></ToggleButton>
        <RadioList label="Format" value={radio} onChange={setRadio} options={[{ value: 'mp4', label: 'MP4', hint: 'Best compatibility' }, { value: 'gif', label: 'GIF', hint: 'Short loops' }]} />
      </Group>
      <Group title="Segmented, Tabs, Slider, ProgressBar">
        <Segmented label="Fit" value={seg} onChange={setSeg} options={[{ value: 'fit', label: 'Fit' }, { value: 'fill', label: 'Fill' }, { value: 'crop', label: 'Crop' }]} />
        <Segmented size="sm" label="Mode" value={side} onChange={setSide} options={[{ value: 'record', icon: <Dot />, hint: 'Record' }, { value: 'edit', icon: <Plus />, hint: 'Edit' }]} />
        <Tabs value={tab} onChange={setTab} items={[{ value: 'look', label: 'Look' }, { value: 'audio', label: 'Audio', badge: <Badge>3</Badge> }, { value: 'export', label: 'Export' }]} />
        <div className="w-64"><Slider label="Padding" value={n} min={0} max={100} step={1} format={(v) => `${v}px`} onChange={setN} /></div>
        <div className="w-64"><RangeInput aria-label="Raw range" value={n} min={0} max={100} onChange={(e) => setN(Number(e.target.value))} /></div>
        <div className="w-64"><ProgressBar value={n / 100} /></div>
      </Group>
      <Group title="Fields: color, time, font, position">
        <div className="w-40"><ColorField label="Background" value={color} onChange={setColor} /></div>
        <TimeField label="Start" value={time} onChange={setTime} max={120} />
        <FontPicker label="Caption font" value={font} fonts={FONTS} onChange={setFont} />
        <PositionPad label="Zoom focus" x={pos.x} y={pos.y} onChange={(x, y) => setPos({ x, y })} />
      </Group>
      <Group title="Overlays: Popover, MenuButton, Tooltip, Modal, Toast">
        <Popover trigger={(open, toggle) => <Button aria-expanded={open} onClick={toggle}>Popover</Button>}>
          {(close) => <div className="p-2 text-sm">Anything goes here. <Button size="sm" variant="subtle" className="ml-2" onClick={close}>Close</Button></div>}
        </Popover>
        <MenuButton label="Export" onPick={() => {}} items={[{ key: 'mp4', label: 'MP4', hint: '⌘E' }, { key: 'gif', label: 'GIF' }]} />
        <Tooltip content="Add a clip" side="bottom"><IconButton label="Add clip"><Plus /></IconButton></Tooltip>
        <Button onClick={() => setModal(true)}>Open Modal</Button>
        <ToastDemo />
        {modal && (
          <Modal onClose={() => setModal(false)} className="max-w-sm p-5">
            <SectionHeader title="Delete recording?" description="This cannot be undone." />
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={() => setModal(false)}>Delete</Button>
            </div>
          </Modal>
        )}
      </Group>
      <Group title="Structure: Card, SettingRow, ListItem, SidebarItem, Badge, EmptyState, Divider, Spinner">
        <div className="grid w-full gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-3">
            <Card><SettingRow title="Show cursor" description="Draws a larger pointer." control={<Switch label="Show cursor" checked={on} onChange={setOn} />} /><Divider /><SettingRow title="Quality" control={<Select defaultValue="hi"><option value="hi">High</option></Select>} /></Card>
            <div className="grid grid-cols-2 gap-3"><Card interactive selected padding="sm">Selected look</Card><Card interactive padding="sm">Interactive look</Card></div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>Neutral</Badge><Badge tone="accent">Pro</Badge><Badge tone="success">Done</Badge><Badge tone="warning">Beta</Badge><Badge tone="danger">Failed</Badge><Spinner />
            </div>
          </div>
          <div className="flex flex-col gap-1 rounded-2xl bg-panel p-2">
            <SidebarItem icon={<Plus />} label="New recording" onClick={() => {}} />
            <SidebarItem icon={<Dot />} label="Library" active onClick={() => {}} trailing={<Badge>12</Badge>} />
            <ListItem leading={<Dot />} title="Product demo.mp4" subtitle="2:14 · 48 MB" selected />
            <ListItem leading={<Dot />} title="Onboarding walkthrough" subtitle="0:52 · 18 MB" onClick={() => {}} />
          </div>
        </div>
        <div className="w-full rounded-2xl border border-line"><EmptyState icon={<Plus />} title="No recordings yet" description="Record your screen and it will show up here." action={<Button variant="primary">Start recording</Button>} /></div>
      </Group>
    </div>
  )
}

/** Side-by-side light and dark. Theme tokens scope to the nearest [data-theme] wrapper. */
export default function UiPreview() {
  return (
    <ToastProvider>
      <div className="grid min-h-screen gap-px bg-line xl:grid-cols-2">
        {(['light', 'dark'] as const).map((t) => (
          <div key={t} data-theme={t} className="bg-bg p-8 text-fg">
            <h1 className="mb-8 text-2xl font-semibold">Components, {t}</h1>
            <Gallery />
          </div>
        ))}
      </div>
    </ToastProvider>
  )
}
