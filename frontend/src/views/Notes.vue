<script setup lang="ts">
</script>

<template>
  <div class="notes">
    <!-- Phase 2: Full note management implementation -->
    <h1>笔记管理</h1>
    <p>您的笔记将显示在这里。</p>
  </div>
</template>

<style scoped>
.notes {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-root);
}
h1 {
  font-family: "Source Han Serif SC", serif;
  color: var(--ink-primary);
}
p {
  color: var(--ink-secondary);
}
</style>
