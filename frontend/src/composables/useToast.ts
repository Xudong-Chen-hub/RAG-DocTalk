import { ref } from 'vue'

export interface Toast {
  id: number
  type: 'success' | 'error' | 'info'
  message: string
  leaving: boolean
}

const toasts = ref<Toast[]>([])
let _id = 0

export function useToast() {
  function add(type: Toast['type'], message: string, duration = 3000) {
    const id = ++_id
    toasts.value.push({ id, type, message, leaving: false })
    setTimeout(() => {
      const t = toasts.value.find(x => x.id === id)
      if (t) t.leaving = true
      setTimeout(() => {
        toasts.value = toasts.value.filter(x => x.id !== id)
      }, 280)
    }, duration)
  }

  function success(msg: string) { add('success', msg) }
  function error(msg: string)   { add('error', msg) }
  function info(msg: string)    { add('info', msg) }

  return { toasts, success, error, info }
}
