import { reactive } from 'vue'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

export interface PromptOptions {
  title: string
  message?: string
  label?: string
  placeholder?: string
  value?: string
  confirmLabel?: string
  cancelLabel?: string
}

export const dialog = reactive({
  open: false,
  mode: 'confirm' as 'confirm' | 'prompt',
  title: '',
  message: '',
  label: '',
  placeholder: '',
  confirmLabel: 'Aceptar',
  cancelLabel: 'Cancelar',
  danger: false,
  value: '',
})

let resolveFn: ((value: boolean | string | null) => void) | null = null

function openDialog(next: Partial<typeof dialog>, mode: 'confirm' | 'prompt') {
  Object.assign(dialog, {
    open: true,
    mode,
    title: '',
    message: '',
    label: '',
    placeholder: '',
    confirmLabel: mode === 'prompt' ? 'Guardar' : 'Aceptar',
    cancelLabel: 'Cancelar',
    danger: false,
    value: '',
    ...next,
  })
}

export function askConfirm(options: ConfirmOptions) {
  openDialog(options, 'confirm')
  return new Promise<boolean>((resolve) => {
    resolveFn = (value) => resolve(Boolean(value))
  })
}

export function askPrompt(options: PromptOptions) {
  openDialog(options, 'prompt')
  return new Promise<string | null>((resolve) => {
    resolveFn = (value) => resolve(typeof value === 'string' ? value : null)
  })
}

export function resolveDialog(accepted: boolean) {
  dialog.open = false
  const fn = resolveFn
  resolveFn = null
  if (!fn) return
  if (dialog.mode === 'prompt') {
    fn(accepted ? dialog.value.trim() : null)
  } else {
    fn(accepted)
  }
}
