<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

const props = defineProps<{ content: string }>()

const html = computed(() => {
  if (!props.content) return ''
  return marked(props.content) as string
})
</script>

<template>
  <div class="md-render" v-html="html" />
</template>

<style>
.md-render {
  line-height: 1.75;
  color: var(--brand-ink-primary);
}
.md-render p {
  margin: 0 0 8px;
}
.md-render p:last-child {
  margin-bottom: 0;
}
.md-render strong {
  font-weight: 600;
  color: var(--brand-ink-primary);
}
.md-render ul, .md-render ol {
  margin: 6px 0;
  padding-left: 20px;
}
.md-render li {
  margin-bottom: 4px;
}
.md-render code {
  font-family: var(--brand-font-mono);
  font-size: 0.88em;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--brand-bg-hover);
}
.md-render pre {
  margin: 10px 0;
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--brand-bg-hover);
  overflow-x: auto;
}
.md-render pre code {
  padding: 0;
  background: none;
}
.md-render blockquote {
  margin: 10px 0;
  padding: 6px 14px;
  border-left: 3px solid var(--brand-accent);
  background: var(--brand-bg-hover);
  border-radius: 0 6px 6px 0;
  color: var(--brand-ink-secondary);
}
.md-render table {
  border-collapse: collapse;
  margin: 10px 0;
  font-size: 0.92em;
}
.md-render th, .md-render td {
  padding: 8px 12px;
  border: 1px solid var(--brand-border);
  text-align: left;
}
.md-render th {
  background: var(--brand-bg-hover);
  font-weight: 600;
}
.md-render h1, .md-render h2, .md-render h3 {
  font-family: var(--brand-font-display);
  margin: 12px 0 6px;
  font-weight: 600;
}
.md-render h1 { font-size: 1.24em; }
.md-render h2 { font-size: 1.12em; }
.md-render h3 { font-size: 1.04em; }
.md-render a {
  color: var(--brand-accent);
  text-decoration: underline;
}
</style>
