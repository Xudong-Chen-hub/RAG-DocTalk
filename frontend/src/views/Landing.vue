<script setup lang="ts">
</script>

<template>
  <div class="landing">
    <!-- Phase 2: Full landing page implementation -->
    <h1>RAG-DocTalk</h1>
    <p>让文档开口说话</p>
  </div>
</template>

<style scoped>
.landing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-root);
}
h1 {
  font-family: "Source Han Serif SC", serif;
  font-size: 3rem;
  color: var(--ink-primary);
  margin-bottom: 0.5rem;
}
p {
  color: var(--ink-secondary);
  font-size: 1.125rem;
}
</style>
