import { toastApi, type ToastOptions, type ToastTone } from '../components/ui'

// Drop-in for sonner's `toast`: same call shape, backed by the kit toast.
type Opts = Omit<ToastOptions, 'message' | 'tone'>
const make = (tone: ToastTone) => (message: string, opts?: Opts) => toastApi.show({ ...opts, message, tone })

export const toast = Object.assign(make('neutral'), {
  success: make('success'),
  error: make('danger'),
  info: make('neutral'),
  warning: make('warning'),
})
