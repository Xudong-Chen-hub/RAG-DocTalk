<script setup lang="ts">
</script>

<template>
  <div class="work">
    <!-- Phase 3+: Three-panel core work interface -->
    <h1>核心工作界面</h1>
    <p>Source · Community · Studio 三面板布局将在此实现。</p>
  </div>
</template>

<style scoped>
.work {
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
