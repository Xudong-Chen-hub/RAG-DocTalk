<script setup lang="ts">
import { ref, reactive, nextTick, onMounted, onUnmounted, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SourcePanel from '@/components/work/SourcePanel.vue'
import CommunityPanel from '@/components/work/CommunityPanel.vue'
import StudioPanel from '@/components/work/StudioPanel.vue'
import Toast from '@/components/Toast.vue'

const route = useRoute()
const router = useRouter()
const noteId = route.params.noteId as string
// Title: query param from Notes page → localStorage fallback → default
const noteTitle = ref((route.query.title as string) || '未命名的笔记')
const editingTitle = ref(false)
const titleInput = ref<HTMLInputElement | null>(null)

// #1: Live stats shared with child panels
const workStats = reactive({ sources: 0, messages: 0, studioFiles: 0 })
provide('workStats', workStats)
// Expose toggle functions to child panels
provide('toggleSource', toggleSource)
provide('toggleStudio', toggleStudio)

// #7: Persist title — save query title, fallback to localStorage
onMounted(() => {
  if (route.query.title) {
    localStorage.setItem(`note-title-${noteId}`, route.query.title as string)
  } else {
    const saved = localStorage.getItem(`note-title-${noteId}`)
    if (saved) noteTitle.value = saved
  }
})

function startEditTitle() {
  editingTitle.value = true
  nextTick(() => titleInput.value?.focus())
}
function saveTitle() {
  editingTitle.value = false
  // #7: Persist title
  localStorage.setItem(`note-title-${noteId}`, noteTitle.value)
}
function onTitleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') saveTitle()
  if (e.key === 'Escape') { noteTitle.value = '未命名的笔记'; saveTitle() }
}

// #4: Panel widths with localStorage persistence
const STORAGE_KEY = 'work-panel-widths'
function loadWidths(): { source: number; studio: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return { source: 25, studio: 30 }
}
function saveWidths() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    source: sourceWidth.value,
    studio: studioWidth.value,
  }))
}

const saved = loadWidths()
const sourceWidth = ref(saved.source)
const studioWidth = ref(saved.studio)

// #2: Panel collapse
const sourceCollapsed = ref(false)
const studioCollapsed = ref(false)
const preCollapseSourceWidth = ref(saved.source)
const preCollapseStudioWidth = ref(saved.studio)

function toggleSource() {
  if (sourceCollapsed.value) {
    sourceWidth.value = preCollapseSourceWidth.value
    sourceCollapsed.value = false
  } else {
    preCollapseSourceWidth.value = sourceWidth.value
    sourceWidth.value = 0
    sourceCollapsed.value = true
  }
  saveWidths()
}
function toggleStudio() {
  if (studioCollapsed.value) {
    studioWidth.value = preCollapseStudioWidth.value
    studioCollapsed.value = false
  } else {
    preCollapseStudioWidth.value = studioWidth.value
    studioWidth.value = 0
    studioCollapsed.value = true
  }
  saveWidths()
}

// Dragging state
const dragging = ref<'source' | 'studio' | null>(null)
let rafPending = false
let lastDragEvent: MouseEvent | null = null

function onDividerDown(which: 'source' | 'studio', _e: MouseEvent) {
  if (which === 'source' && sourceCollapsed.value) return
  if (which === 'studio' && studioCollapsed.value) return
  dragging.value = which
  document.addEventListener('mousemove', onDragRaw)
  document.addEventListener('mouseup', onDragEnd)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

// Raw handler — just stashes the event, lets rAF do the work
function onDragRaw(e: MouseEvent) {
  lastDragEvent = e
  if (!rafPending) {
    rafPending = true
    requestAnimationFrame(() => {
      rafPending = false
      if (lastDragEvent) onDrag(lastDragEvent)
    })
  }
}

function onDrag(e: MouseEvent) {
  const total = window.innerWidth
  const px = (e.clientX / total) * 100
  if (dragging.value === 'source') {
    const w = Math.round(Math.max(15, Math.min(40, px)) * 10) / 10
    sourceWidth.value = w
    sourceCollapsed.value = false
  } else if (dragging.value === 'studio') {
    const rightEdge = 100 - px
    const w = Math.round(Math.max(15, Math.min(40, rightEdge)) * 10) / 10
    studioWidth.value = w
    studioCollapsed.value = false
  }
}

function onDragEnd() {
  dragging.value = null
  lastDragEvent = null
  document.removeEventListener('mousemove', onDragRaw)
  document.removeEventListener('mouseup', onDragEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  saveWidths()
}

// #5: Keyboard shortcuts
function onKeydown(e: KeyboardEvent) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key === '[') { e.preventDefault(); toggleSource() }
  if (mod && e.key === ']') { e.preventDefault(); toggleStudio() }
  if (e.key === 'Escape') {
    if (editingTitle.value) { noteTitle.value = '未命名的笔记'; saveTitle() }
  }
}
onMounted(() => document.addEventListener('keydown', onKeydown))

function goBack() {
  router.push('/notes')
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDragRaw)
  document.removeEventListener('mouseup', onDragEnd)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="work-app bg-texture">
    <!-- Toast notifications -->
    <Toast />

    <!-- Top Bar -->
    <header class="work-topbar">
      <button class="wtb-back" @click="goBack">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      </button>
      <span v-if="!editingTitle" class="wtb-title" @click="startEditTitle">{{ noteTitle }}</span>
      <input
        v-else
        ref="titleInput"
        v-model="noteTitle"
        class="wtb-title-input"
        @blur="saveTitle"
        @keydown="onTitleKeydown"
      />
      <div class="wtb-actions">
        <button class="wtb-act">分享</button>
      </div>
    </header>

    <!-- Panel Area -->
    <div class="work-panels" :class="{ 'is-dragging': !!dragging }">
      <!-- Source Panel -->
      <div v-show="!sourceCollapsed" class="work-panel work-panel-anim" :style="{ width: sourceWidth + '%' }">
        <SourcePanel :note-id="noteId" />
      </div>

      <!-- Collapsed Source strip -->
      <div v-if="sourceCollapsed" class="work-collapsed-strip" @click="toggleSource" title="展开来源面板">
        <svg class="strip-arrow strip-arrow-right" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        <div class="strip-body">
          <span class="strip-label">来源</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        </div>
      </div>

      <!-- Divider -->
      <div
        v-show="!sourceCollapsed"
        class="work-divider"
        :class="{ active: dragging === 'source' }"
        @mousedown="onDividerDown('source', $event)"
      >
        <span class="work-divider-handle" />
      </div>

      <!-- Community Panel -->
      <div class="work-panel community-panel work-panel-anim" :style="{ flex: 1 }">
        <CommunityPanel :note-id="noteId" />
      </div>

      <!-- Divider -->
      <div
        v-show="!studioCollapsed"
        class="work-divider"
        :class="{ active: dragging === 'studio' }"
        @mousedown="onDividerDown('studio', $event)"
      >
        <span class="work-divider-handle" />
      </div>

      <!-- Studio Panel -->
      <div v-show="!studioCollapsed" class="work-panel work-panel-anim" :style="{ width: studioWidth + '%' }">
        <StudioPanel :note-id="noteId" />
      </div>

      <!-- Collapsed Studio strip -->
      <div v-if="studioCollapsed" class="work-collapsed-strip" @click="toggleStudio" title="展开 Studio 面板">
        <svg class="strip-arrow strip-arrow-left" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        <div class="strip-body">
          <span class="strip-label">Studio</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></svg>
        </div>
      </div>
    </div>

    <!-- Status Bar — #1 live stats -->
    <footer class="work-statusbar">
      <span>来源 · {{ workStats.sources }}</span>
      <span>对话 · {{ workStats.messages }} 轮</span>
      <span>Studio · {{ workStats.studioFiles }} 个文件</span>
      <span class="wsb-hint">Ctrl+[ / Ctrl+] 切换面板</span>
    </footer>
  </div>
</template>

<style scoped>
.work-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--brand-bg-root);
  font-family: var(--brand-font-body);
  overflow: hidden;
}

/* Top Bar */
.work-topbar {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  background: transparent;
  flex-shrink: 0;
  z-index: 10;
}
.wtb-back {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px; height: 32px;
  background: none; border: none;
  color: var(--brand-ink-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: background 200ms, color 200ms;
}
.wtb-back:hover { background: var(--brand-bg-hover); color: var(--brand-ink-primary); }
.wtb-title {
  flex: 1;
  font-family: var(--brand-font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  cursor: pointer;
  padding: 4px 8px;
  margin: -4px -8px;
  border-radius: 6px;
  transition: background 200ms;
}
.wtb-title:hover { background: var(--brand-bg-hover); }
.wtb-title-input {
  flex: 1;
  font-family: var(--brand-font-display);
  font-size: 15px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  background: var(--brand-bg-root);
  border: 1px solid var(--brand-accent);
  border-radius: 6px;
  padding: 4px 8px;
  outline: none;
  box-shadow: 0 0 0 2px rgba(107,155,94,0.1);
}
.wtb-act {
  padding: 6px 14px;
  font-size: 13px;
  font-family: var(--brand-font-body);
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  background: none;
  color: var(--brand-ink-secondary);
  cursor: pointer;
  transition: background 200ms, color 200ms, border-color 200ms;
}
.wtb-act:hover { background: var(--brand-bg-hover); }
.wtb-act.active { color: var(--brand-accent); border-color: var(--brand-accent); }

/* Panels */
.work-panels {
  flex: 1;
  display: flex;
  overflow: hidden;
  gap: var(--panel-gap);
  padding: 0 15px;
}
.work-panel {
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
  background: var(--brand-bg-root);
  position: relative;
  border-radius: var(--panel-radius);
}
/* #6: subtle transition for panel width changes (only when NOT dragging) */
.work-panel-anim {
  transition: width 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
/* Kill transitions during drag for pixel-perfect tracking */
.work-panels.is-dragging .work-panel-anim {
  transition: none;
}
/* GPU layer hint during drag */
.work-panels.is-dragging .work-panel {
  will-change: width;
}
/* Prevent all text selection while dragging */
.work-panels.is-dragging {
  user-select: none;
  -webkit-user-select: none;
}
.community-panel {
  flex-shrink: 1;
  min-width: 320px;
  background: var(--brand-bg-root);
  border-radius: var(--panel-radius);
}

/* #2: Collapsed strip */
.work-collapsed-strip {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 48px;
  flex-shrink: 0;
  cursor: pointer;
  background: var(--brand-bg-surface);
  border-radius: var(--panel-radius);
  border: 1px solid var(--brand-border);
  transition: background 200ms, border-color 200ms;
  color: var(--brand-ink-secondary);
  margin: 4px 0;
  padding: 12px 0;
}
.strip-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.work-collapsed-strip:hover {
  background: var(--brand-bg-hover);
  border-color: var(--brand-accent);
  color: var(--brand-accent);
}
.strip-label {
  font-size: 11px;
  font-weight: 500;
  writing-mode: vertical-rl;
  letter-spacing: 0.06em;
}
.strip-arrow {
  opacity: 0.45;
  transition: transform 200ms ease, opacity 200ms;
}
.work-collapsed-strip:hover .strip-arrow {
  opacity: 0.8;
}
.strip-arrow-right:hover,
.work-collapsed-strip:hover .strip-arrow-right {
  transform: translateX(2px);
}
.strip-arrow-left:hover,
.work-collapsed-strip:hover .strip-arrow-left {
  transform: translateX(-2px);
}

/* Dividers — #3: wider hit area, smoother feel */
.work-divider {
  width: var(--divider-width);
  cursor: col-resize;
  background: var(--brand-border);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  z-index: 5;
  transition: background 200ms;
}
/* Invisible grab extension — 14px total touch zone */
.work-divider::before {
  content: '';
  position: absolute;
  inset: -7px;
  left: -7px;
  right: -7px;
  background: transparent;
  z-index: 0;
}
.work-divider::after {
  content: '';
  position: absolute;
  inset: 0;
  width: var(--divider-hit-area);
  left: calc(var(--divider-hit-area) / -2 + 0.5px);
  background: transparent;
  transition: background 200ms;
}
.work-divider:hover,
.work-divider.active {
  background: var(--brand-accent);
  opacity: 0.35;
}
.work-divider:hover::after,
.work-divider.active::after {
  background: rgba(107,155,94,0.06);
}
.work-divider-handle {
  width: 5px;
  height: 36px;
  border-radius: 3px;
  background: transparent;
  transition: background 200ms, transform 200ms;
  z-index: 1;
  position: relative;
}
.work-divider:hover .work-divider-handle {
  background: var(--brand-accent);
  opacity: 0.6;
  transform: scaleY(1.2);
}
.work-divider.active .work-divider-handle {
  background: var(--brand-accent);
  opacity: 0.8;
  transform: scaleY(1.4);
}

/* Status Bar — #1 */
.work-statusbar {
  height: 28px;
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 0 16px;
  background: none;
  font-size: 11px;
  color: var(--brand-ink-secondary);
  flex-shrink: 0;
}
.wsb-hint {
  margin-left: auto;
  opacity: 0.45;
}
</style>
