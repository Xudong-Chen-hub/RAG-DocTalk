<script setup lang="ts">
import { computed } from 'vue'
import { useTransitionStore } from '@/stores/transition'

const store = useTransitionStore()

const visible = computed(() => store.phase !== 'idle' && store.phase !== 'done')

// Glow circle expands from hero CTA area (center, ~55% from top)
const clipSize = computed(() => {
  // progress 0→1 maps to circle radius 0→150vmax (guaranteed to cover screen corners)
  return store.progress * 150
})
const isFading = computed(() => store.phase === 'fading')
</script>

<template>
  <div v-if="visible" class="glow-root" :class="{ fading: isFading }">
    <!-- Expanding green glow circle -->
    <div
      class="glow-circle"
      :style="{
        width: clipSize + 'vmax',
        height: clipSize + 'vmax',
        opacity: store.overlayAlpha,
      }"
    />
    <!-- Full-screen green wash that fades in behind the circle -->
    <div
      class="glow-wash"
      :style="{ opacity: store.overlayAlpha * 0.5 }"
    />
  </div>
</template>

<style scoped>
.glow-root {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
}
.glow-root.fading {
  transition: opacity 0.35s ease-in;
}

/* Expanding circle — starts small at hero CTA, fills screen */
.glow-circle {
  position: absolute;
  top: 55%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: radial-gradient(
    circle at center,
    rgba(107, 155, 94, 0.12) 0%,
    rgba(107, 155, 94, 0.35) 30%,
    rgba(80, 130, 70, 0.65) 60%,
    rgba(60, 110, 55, 0.85) 85%,
    rgba(45, 90, 40, 0.95) 100%
  );
  will-change: width, height, opacity;
}

/* Subtle green wash that blooms behind */
.glow-wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 50% 55%,
    rgba(107, 155, 94, 0.15) 0%,
    rgba(80, 130, 70, 0.08) 40%,
    transparent 70%
  );
  transition: opacity 0.4s ease-out;
}
</style>
