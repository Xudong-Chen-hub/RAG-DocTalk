<script setup lang="ts">
import { ref, watch, inject } from 'vue'
import AddSourceModal from './AddSourceModal.vue'
import { useToast } from '@/composables/useToast'

defineProps<{ noteId: string }>()

// #1: Live stats injection
const workStats = inject<{ sources: number; messages: number; studioFiles: number }>('workStats')
const toggleSource = inject<() => void>('toggleSource')
const toast = useToast()

interface Source {
  id: string; name: string; type: 'pdf' | 'docx' | 'xlsx' | 'txt' | 'web' | 'manual'
  chars: number; addedAt: string; preview?: string
}

interface ProcessingItem {
  id: string; name: string; stage: string; progress: number
}

const sources = ref<Source[]>([])
// #9: active source selection
const activeSourceId = ref<string | null>(null)
// #12: processing state
const processingItems = ref<ProcessingItem[]>([])
const showAddModal = ref(false)
// #13: action menu
const menuSourceId = ref<string | null>(null)

// #1: sync stats
watch(() => sources.value.length, (n) => { if (workStats) workStats.sources = n }, { immediate: true })

// #8: Type icon/color map
const typeMeta: Record<string, { icon: string; color: string; label: string }> = {
  pdf:   { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15h6', color: '#D4544A', label: 'PDF' },
  docx:  { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 12h6M9 15h6M9 18h3', color: '#4A8AD4', label: 'Word' },
  xlsx:  { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 12h6M9 15h6M9 18h3', color: '#4AAF5A', label: 'Excel' },
  txt:   { icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 12h6', color: '#8B9288', label: 'TXT' },
  web:   { icon: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0zM3.6 9h16.8M3.6 15h16.8M12 3a14.7 14.7 0 0 1 0 18', color: '#7B9EC7', label: 'Web' },
  manual:{ icon: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z', color: '#A48AC7', label: '手动' },
}

// #10: Generate preview text
function genPreview(_chars: number, type: string): string {
  const samples: Record<string, string> = {
    pdf: '包含文档结构、段落与格式信息…',
    docx: '包含富文本格式、表格与样式…',
    xlsx: '包含电子表格数据与公式…',
    txt: '纯文本内容，无格式信息…',
    web: '从网页提取的文本内容摘要…',
    manual:'用户手动输入的文本内容…',
  }
  return samples[type] || '文本内容…'
}

// #14: Search history
const searchHistory = ref<string[]>(loadSearchHistory())
const showHistory = ref(false)
function loadSearchHistory(): string[] {
  try { return JSON.parse(localStorage.getItem('search-history') || '[]') } catch { return [] }
}
function saveSearchHistory() {
  localStorage.setItem('search-history', JSON.stringify(searchHistory.value.slice(0, 10)))
}

// Inline search state
const siMode = ref('web')
const siSpeed = ref('fast')
const siQuery = ref('')
const siModeOpen = ref(false)
const siSpeedOpen = ref(false)
const siModes = [
  { v:'web', icon:'🌐', label:'Web' },
  { v:'scholar', icon:'📚', label:'Scholar' },
]
const siSpeeds = [
  { v:'fast', icon:'⚡', label:'快速搜索' },
  { v:'deep', icon:'🔬', label:'深度研究' },
]
function siSearch() {
  if (!siQuery.value.trim()) return
  const query = siQuery.value.trim()
  // #14: Save to history
  if (!searchHistory.value.includes(query)) {
    searchHistory.value.unshift(query)
    saveSearchHistory()
  }
  const procId = Date.now().toString()
  // #12: Simulate processing stages
  processingItems.value.push({ id: procId, name: `网页: ${query.slice(0, 25)}`, stage: '正在搜索…', progress: 20 })
  const timer = setInterval(() => {
    const p = processingItems.value.find(x => x.id === procId)
    if (!p) { clearInterval(timer); return }
    if (p.progress < 60) { p.progress += 8; p.stage = '正在提取文本…' }
    else if (p.progress < 90) { p.progress += 3; p.stage = '正在向量化…' }
    else {
      p.progress = 100; p.stage = '就绪'
      clearInterval(timer)
      setTimeout(() => {
        processingItems.value = processingItems.value.filter(x => x.id !== procId)
        sources.value.unshift({
          id: procId, name: `网页: ${query.slice(0, 25)}`, type: 'web',
          chars: 800, addedAt: '刚刚', preview: genPreview(800, 'web'),
        })
        toast.success('来源添加成功')
      }, 300)
    }
  }, 400)
  siQuery.value = ''
  showHistory.value = false
}

// #11: Panel-level drag-drop
const isPanelDragging = ref(false)
function onPanelDrop(e: DragEvent) {
  isPanelDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) processUploadedFile(file)
}
function processUploadedFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const m: Record<string, Source['type']> = { pdf:'pdf', docx:'docx', doc:'docx', xlsx:'xlsx', xls:'xlsx', txt:'txt' }
  const type = m[ext] || 'txt'
  const id = Date.now().toString()
  processingItems.value.push({ id, name: file.name, stage: '正在解析…', progress: 10 })
  const timer = setInterval(() => {
    const p = processingItems.value.find(x => x.id === id)
    if (!p) { clearInterval(timer); return }
    if (p.progress < 50) { p.progress += 6; p.stage = '正在分块…' }
    else if (p.progress < 90) { p.progress += 3; p.stage = '正在向量化…' }
    else {
      p.progress = 100; p.stage = '就绪'
      clearInterval(timer)
      setTimeout(() => {
        processingItems.value = processingItems.value.filter(x => x.id !== id)
        sources.value.unshift({
          id, name: file.name, type,
          chars: Math.floor(file.size * 0.3), addedAt: '刚刚',
          preview: genPreview(Math.floor(file.size * 0.3), type),
        })
        toast.success(`${file.name} 已就绪`)
      }, 300)
    }
  }, 400)
}

function addSource(s: { id: string; name: string; type: Source['type']; chars: number }) {
  const id = Date.now().toString()
  processingItems.value.push({ id, name: s.name, stage: '正在解析…', progress: 10 })
  const timer = setInterval(() => {
    const p = processingItems.value.find(x => x.id === id)
    if (!p) { clearInterval(timer); return }
    if (p.progress < 50) { p.progress += 6; p.stage = '正在分块…' }
    else if (p.progress < 90) { p.progress += 3; p.stage = '正在向量化…' }
    else {
      p.progress = 100; p.stage = '就绪'
      clearInterval(timer)
      setTimeout(() => {
        processingItems.value = processingItems.value.filter(x => x.id !== id)
        sources.value.unshift({
          id, name: s.name, type: s.type,
          chars: s.chars, addedAt: '刚刚',
          preview: genPreview(s.chars, s.type),
        })
        toast.success(`${s.name} 已就绪`)
      }, 300)
    }
  })
  showAddModal.value = false
}

// #9: Select source
function blurHistory() { setTimeout(() => showHistory.value = false, 200) }
function focusSearch() { if (searchHistory.value.length > 0) showHistory.value = true }

function selectSource(id: string) {
  activeSourceId.value = activeSourceId.value === id ? null : id
}

// #13: Action menu
function toggleMenu(id: string, e: Event) {
  e.stopPropagation()
  menuSourceId.value = menuSourceId.value === id ? null : id
}
function closeMenu() { menuSourceId.value = null }

function removeSource(id: string) {
  const src = sources.value.find(s => s.id === id)
  sources.value = sources.value.filter(s => s.id !== id)
  if (activeSourceId.value === id) activeSourceId.value = null
  menuSourceId.value = null
  if (src) toast.info(`已移除「${src.name}」`)
}

// Close menu on click outside
if (typeof document !== 'undefined') {
  document.addEventListener('click', closeMenu)
}

</script>

<template>
  <div
    class="source-panel"
    :class="{ 'drag-over': isPanelDragging }"
    @dragover.prevent="isPanelDragging = true"
    @dragleave="isPanelDragging = false"
    @drop.prevent="onPanelDrop"
  >
    <!-- #11: Drag overlay -->
    <div v-if="isPanelDragging" class="sp-drag-overlay">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <span>释放以添加文件</span>
    </div>

    <!-- Header — #15 badge + collapse -->
    <div class="sp-header">
      <span class="sp-title">
        来源
        <span v-if="sources.length > 0" class="sp-badge">{{ sources.length }}</span>
      </span>
      <button class="sp-collapse-btn" title="折叠面板" @click="toggleSource?.()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
    </div>

    <!-- Add Source Modal (NotebookLM style) -->
    <AddSourceModal v-if="showAddModal" @close="showAddModal = false" @add-source="addSource" />

    <!-- Search + Add Source bar -->
    <div class="sp-search">
      <div class="sp-search-bar" @focusin="showHistory = searchHistory.length > 0">
        <svg class="sp-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="siQuery" type="text" placeholder="在网络中搜索新来源..." class="sp-search-input" @keyup.enter="siSearch" @focus="focusSearch" @blur="blurHistory" />
        <button class="sp-search-btn" @click="siSearch">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg>
        </button>
      </div>
      <!-- #14: Search history dropdown -->
      <div v-if="showHistory && searchHistory.length > 0" class="sp-history-drop">
        <div class="sp-history-label">最近搜索</div>
        <button
          v-for="(h, i) in searchHistory.slice(0, 5)"
          :key="i"
          class="sp-history-item"
          @mousedown.prevent="siQuery = h; siSearch()"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          {{ h }}
        </button>
      </div>
      <button class="sp-add-inline" @click="showAddModal = true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        添加来源
      </button>
      <div class="sp-search-top">
        <div class="sp-search-drop" :class="{ open: siModeOpen }">
          <button class="sp-search-drop-btn" @click="siModeOpen=!siModeOpen; siSpeedOpen=false">
            <span class="sp-search-drop-icon">{{ siModes.find(m=>m.v===siMode)?.icon }}</span>
            {{ siModes.find(m=>m.v===siMode)?.label }}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-if="siModeOpen" class="sp-search-drop-menu">
            <button v-for="m in siModes" :key="m.v" :class="{ active: siMode===m.v }" @click="siMode=m.v; siModeOpen=false">{{ m.icon }} {{ m.label }}</button>
          </div>
        </div>
        <div class="sp-search-drop" :class="{ open: siSpeedOpen }">
          <button class="sp-search-drop-btn" @click="siSpeedOpen=!siSpeedOpen; siModeOpen=false">
            <span class="sp-search-drop-icon">{{ siSpeeds.find(s=>s.v===siSpeed)?.icon }}</span>
            {{ siSpeeds.find(s=>s.v===siSpeed)?.label }}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div v-if="siSpeedOpen" class="sp-search-drop-menu">
            <button v-for="s in siSpeeds" :key="s.v" :class="{ active: siSpeed===s.v }" @click="siSpeed=s.v; siSpeedOpen=false">{{ s.icon }} {{ s.label }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- #12: Processing items -->
    <div v-if="processingItems.length > 0" class="sp-processing">
      <div v-for="p in processingItems" :key="p.id" class="sp-proc-item">
        <div class="sp-proc-info">
          <span class="sp-proc-name">{{ p.name }}</span>
          <span class="sp-proc-stage">{{ p.stage }}</span>
        </div>
        <div class="sp-proc-bar"><div class="sp-proc-fill" :style="{ width: p.progress + '%' }" /></div>
      </div>
    </div>

    <!-- Source list or empty -->
    <div v-if="sources.length === 0 && processingItems.length === 0" class="sp-empty">
      <div class="sp-empty-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      </div>
      <p class="sp-empty-main">已保存的来源将显示在此处</p>
      <p class="sp-empty-sub">拖放文件到此处，或点击「添加来源」上传本地文件（支持 PDF、Word、Excel、TXT），粘贴文本内容，或进行联网搜索。</p>
    </div>

    <div v-else class="sp-list">
      <div
        v-for="src in sources"
        :key="src.id"
        class="sp-item"
        :class="{ active: activeSourceId === src.id }"
        @click="selectSource(src.id)"
      >
        <!-- #8: Type-colored icon -->
        <svg class="sp-item-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" :stroke="typeMeta[src.type]?.color || 'currentColor'" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path :d="typeMeta[src.type]?.icon || ''" />
        </svg>
        <div class="sp-item-info">
          <span class="sp-item-name">{{ src.name }}</span>
          <!-- #10: Preview -->
          <span class="sp-item-preview" v-if="src.preview">{{ src.preview }}</span>
          <span class="sp-item-meta">
            <span class="sp-item-type-tag" :style="{ background: (typeMeta[src.type]?.color || '#888') + '18', color: typeMeta[src.type]?.color }">{{ typeMeta[src.type]?.label || src.type.toUpperCase() }}</span>
            {{ src.chars.toLocaleString() }} 字符 · {{ src.addedAt }}
          </span>
        </div>
        <!-- #13: Action menu -->
        <div class="sp-item-actions" @click.stop>
          <button class="sp-item-menu-btn" @click="toggleMenu(src.id, $event)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
          </button>
          <div v-if="menuSourceId === src.id" class="sp-context-menu">
            <button @click="removeSource(src.id)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              移除来源
            </button>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.source-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--panel-padding);
  background: var(--brand-bg-surface);
  border-radius: var(--panel-radius);
  position: relative;
}
.sp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.sp-collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: none; border-radius: 6px;
  background: none;
  color: var(--brand-ink-secondary);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.sp-collapse-btn:hover { background: var(--brand-bg-hover); color: var(--brand-ink-primary); }
.sp-title {
  font-family: var(--brand-font-display);
  font-size: 16px; font-weight: 600;
  color: var(--brand-ink-primary);
  display: flex; align-items: center; gap: 8px;
}
/* #15: Badge */
.sp-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px;
  padding: 0 6px;
  font-size: 11px; font-weight: 600;
  font-family: var(--brand-font-body);
  background: var(--brand-accent);
  color: #fff;
  border-radius: 10px;
}

/* #11: Drag overlay */
.sp-drag-overlay {
  position: absolute; inset: 0; z-index: 30;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px;
  background: rgba(107,155,94,0.06);
  border: 2px dashed var(--brand-accent);
  border-radius: var(--panel-radius);
  color: var(--brand-accent);
  font-size: 14px; font-weight: 500;
  pointer-events: none;
}
.source-panel.drag-over { outline: 2px solid var(--brand-accent); outline-offset: -2px; }

/* #14: Search history */
.sp-history-drop {
  position: absolute; top: calc(100% - 46px); left: 10px; right: 10px;
  background: var(--brand-bg-surface);
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  padding: 4px;
  z-index: 15;
  box-shadow: 0 4px 16px rgba(27,29,26,.08);
}
.sp-history-label {
  font-size: 10px; font-weight: 600; color: var(--brand-ink-secondary);
  padding: 6px 10px 4px; text-transform: uppercase; letter-spacing: 0.04em;
}
.sp-history-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 10px;
  font-size: 12px; font-family: var(--brand-font-body);
  background: none; border: none; border-radius: 5px;
  color: var(--brand-ink-secondary); cursor: pointer;
  transition: background .1s;
}
.sp-history-item:hover { background: var(--brand-bg-hover); color: var(--brand-ink-primary); }
.sp-history-item svg { opacity: 0.4; }

/* Inline add source button */
.sp-add-inline {
  display: flex; align-items: center; justify-content: center;
  gap: 6px; width: 100%;
  padding: 8px; margin-top: 8px;
  font-size: 13px; font-weight: 500;
  font-family: var(--brand-font-body);
  border: 1px solid var(--brand-border);
  border-radius: 7px;
  background: var(--brand-bg-surface);
  color: var(--brand-ink-primary); cursor: pointer;
  transition: border-color .15s, background .15s;
}
.sp-add-inline:hover { border-color: var(--brand-accent); background: var(--brand-bg-hover); }

/* Inline web search */
.sp-search {
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 14px;
  background: var(--brand-bg-root);
  min-width: 0;
  overflow: visible;
  position: relative;
}
.sp-search-top { display: flex; gap: 6px; margin-top: 8px; position: relative; }
.sp-search-drop { position: relative; }
.sp-search-drop.open .sp-search-drop-btn { border-color: var(--brand-accent); box-shadow: 0 0 0 2px rgba(107,155,94,.1); }
.sp-search-drop-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 5px 10px;
  font-size: 12px; font-family: var(--brand-font-body);
  border: 1px solid var(--brand-border);
  border-radius: 6px; background: var(--brand-bg-root);
  color: var(--brand-ink-primary); cursor: pointer;
  transition: border-color .15s, box-shadow .15s;
}
.sp-search-drop-btn:hover { border-color: var(--brand-accent); }
.sp-search-drop-icon { font-size: 12px; line-height: 1; }
.sp-search-drop-menu {
  position: absolute; top: calc(100% + 4px); left: 0;
  min-width: 140px;
  background: var(--brand-bg-surface);
  border: 1px solid var(--brand-border);
  border-radius: 8px; padding: 4px;
  z-index: 10;
  box-shadow: 0 4px 16px rgba(27,29,26,.08);
}
.sp-search-drop-menu button {
  display: flex; align-items: center; gap: 6px;
  width: 100%; padding: 7px 10px;
  font-size: 12px; font-family: var(--brand-font-body);
  background: none; border: none; border-radius: 5px;
  color: var(--brand-ink-primary); cursor: pointer;
  transition: background .1s;
}
.sp-search-drop-menu button:hover { background: var(--brand-bg-hover); }
.sp-search-drop-menu button.active { background: var(--brand-bg-hover); color: var(--brand-accent); font-weight: 500; }
.sp-search-bar { display: flex; align-items: center; gap: 6px; padding: 7px 10px; border: 1px solid var(--brand-border); border-radius: 7px; background: var(--brand-bg-surface); transition: border-color .15s; min-width: 0; }
.sp-search-bar:focus-within { border-color: var(--brand-accent); }
.sp-search-icon { color: var(--brand-ink-secondary); opacity: .4; flex-shrink: 0; }
.sp-search-input { flex: 1; min-width: 0; border: none; outline: none; font-size: 13px; font-family: var(--brand-font-body); color: var(--brand-ink-primary); background: none; overflow: hidden; }
.sp-search-input::placeholder { color: var(--brand-ink-secondary); opacity: .5; }
.sp-search-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; border-radius: 6px; background: var(--brand-accent); color: #fff; cursor: pointer; flex-shrink: 0; transition: background .15s; }
.sp-search-btn:hover { background: #7DA86F; }

/* #12: Processing items */
.sp-processing {
  margin-bottom: 12px;
  display: flex; flex-direction: column; gap: 8px;
}
.sp-proc-item {
  padding: 10px 12px;
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  background: var(--brand-bg-root);
}
.sp-proc-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.sp-proc-name { font-size: 12px; font-weight: 500; color: var(--brand-ink-primary); max-width: 60%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sp-proc-stage { font-size: 11px; color: var(--brand-accent); }
.sp-proc-bar { height: 4px; background: var(--brand-border); border-radius: 2px; overflow: hidden; }
.sp-proc-fill { height: 100%; background: var(--brand-accent); border-radius: 2px; transition: width .4s ease-out; }

/* Empty */
.sp-empty { text-align: center; padding: 36px 16px; display: flex; flex-direction: column; align-items: center; }
.sp-empty-icon { color: var(--brand-accent); opacity: 0.25; margin-bottom: 14px; }
.sp-empty-main {
  font-family: var(--brand-font-display);
  font-size: 15px; font-weight: 600;
  color: var(--brand-ink-primary); margin: 0 0 8px;
}
.sp-empty-sub {
  font-size: 12px; color: var(--brand-ink-secondary);
  line-height: 1.6; max-width: 260px; margin: 0;
}

/* Source list */
.sp-list { flex: 1; overflow-y: auto; }
.sp-item {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px; border-radius: 8px;
  cursor: pointer;
  transition: background 150ms, box-shadow 150ms;
  position: relative;
}
.sp-item:hover { background: var(--brand-bg-hover); }
/* #9: Active state */
.sp-item.active {
  background: var(--brand-bg-hover);
  box-shadow: inset 3px 0 0 var(--brand-accent);
}
.sp-item-icon { margin-top: 2px; flex-shrink: 0; }
.sp-item-info { flex: 1; min-width: 0; }
.sp-item-name { display: block; font-size: 13px; font-weight: 500; color: var(--brand-ink-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
/* #10: Preview */
.sp-item-preview {
  display: block; font-size: 11px; color: var(--brand-ink-secondary);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  margin-top: 2px; line-height: 1.4;
}
.sp-item-meta { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--brand-ink-secondary); margin-top: 4px; flex-wrap: wrap; }
/* #8: Type tag */
.sp-item-type-tag {
  display: inline-block;
  padding: 1px 6px;
  font-size: 10px; font-weight: 600;
  border-radius: 3px;
  letter-spacing: 0.02em;
}

/* #13: Action menu */
.sp-item-actions { position: relative; flex-shrink: 0; }
.sp-item-menu-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; background: none; border: none;
  color: var(--brand-ink-secondary); cursor: pointer;
  border-radius: 4px; opacity: 0; transition: opacity 150ms, background 150ms;
}
.sp-item:hover .sp-item-menu-btn { opacity: 0.5; }
.sp-item-menu-btn:hover { opacity: 1 !important; background: var(--brand-bg-hover); color: var(--brand-ink-primary); }
.sp-context-menu {
  position: absolute; top: 100%; right: 0;
  min-width: 140px;
  background: var(--brand-bg-surface);
  border: 1px solid var(--brand-border);
  border-radius: 8px; padding: 4px;
  z-index: 20;
  box-shadow: 0 6px 24px rgba(27,29,26,.1);
}
.sp-context-menu button {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px;
  font-size: 12px; font-family: var(--brand-font-body);
  background: none; border: none; border-radius: 5px;
  color: var(--brand-danger); cursor: pointer;
  transition: background .1s;
}
.sp-context-menu button:hover { background: var(--brand-bg-hover); }
</style>
