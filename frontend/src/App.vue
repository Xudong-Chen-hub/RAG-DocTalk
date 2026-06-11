<script setup lang="ts">
import SunriseOverlay from '@/components/SunriseOverlay.vue'
</script>

<template>
  <router-view v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </router-view>
  <SunriseOverlay />
</template>

<style>
.page-enter-active {
  transition: opacity 400ms cubic-bezier(0.22, 0.61, 0.36, 1),
              transform 400ms cubic-bezier(0.22, 0.61, 0.36, 1);
}
.page-leave-active {
  transition: opacity 350ms cubic-bezier(0.55, 0.06, 0.68, 0.19),
              transform 350ms cubic-bezier(0.55, 0.06, 0.68, 0.19);
}
.page-enter-from {
  opacity: 0;
  transform: scale(0.98) translateY(8px);
}
.page-leave-to {
  opacity: 0;
  transform: scale(0.97) translateY(-6px);
}
</style>
