<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { toasts } = useToast()

const icons: Record<string, string> = {
  success: 'M20 6L9 17l-5-5',
  error:   'M18 6L6 18M6 6l12 12',
  info:    'M12 16v-4M12 8h.01',
}
const iconColors: Record<string, string> = {
  success: 'var(--brand-accent)',
  error:   'var(--brand-danger)',
  info:    '#7B9EC7',
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="toast-item"
        :class="[t.type, { leaving: t.leaving }]"
      >
        <svg class="toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" :stroke="iconColors[t.type]" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path :d="icons[t.type]" />
        </svg>
        <span class="toast-msg">{{ t.message }}</span>
      </div>
    </div>
  </Teleport>
</template>
