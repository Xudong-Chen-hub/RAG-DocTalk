import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useTransitionStore = defineStore('transition', () => {
  const phase = ref<'idle' | 'expanding' | 'fading' | 'done'>('idle')
  const progress = ref(0)     // 0→1 光晕扩散进度
  const overlayAlpha = ref(0) // 覆盖层透明度

  let raf = 0
  let startTime = 0
  let onNavigate: (() => void) | null = null

  function startGlow(navigate: () => void) {
    if (phase.value !== 'idle') return
    onNavigate = navigate
    startTime = performance.now()
    phase.value = 'expanding'
    raf = requestAnimationFrame(tick)
  }

  function tick(now: number) {
    const elapsed = now - startTime

    // 0-500ms: 光晕从 CTA 按钮处扩散填满屏幕
    // 400ms: 触发路由跳转
    // 500-900ms: 光晕淡出，Notes 页面展现
    // 900ms+: 结束

    if (elapsed < 500) {
      phase.value = 'expanding'
      const p = easeOut(elapsed / 500)
      progress.value = p
      overlayAlpha.value = p * 0.85
    } else if (elapsed < 900) {
      phase.value = 'fading'
      const p = (elapsed - 500) / 400
      progress.value = 1
      overlayAlpha.value = 0.85 * (1 - easeIn(p))
    } else {
      phase.value = 'done'
      progress.value = 1
      overlayAlpha.value = 0
      cancelAnimationFrame(raf)
      return
    }

    // 在扩散到 80% 时触发路由跳转 (~400ms)
    if (elapsed > 400 && onNavigate) {
      const nav = onNavigate
      onNavigate = null
      nav()
    }

    raf = requestAnimationFrame(tick)
  }

  function easeOut(t: number) { return 1 - Math.pow(1 - t, 3) }
  function easeIn(t: number) { return t * t * t }

  function reset() {
    cancelAnimationFrame(raf)
    phase.value = 'idle'
    progress.value = 0
    overlayAlpha.value = 0
    onNavigate = null
  }

  return { phase, progress, overlayAlpha, startGlow, reset }
})
