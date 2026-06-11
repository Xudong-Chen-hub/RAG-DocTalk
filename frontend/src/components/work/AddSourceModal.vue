<script setup lang="ts">
import { ref } from 'vue'

interface Src { id: string; name: string; type: 'pdf'|'docx'|'xlsx'|'txt'|'web'|'manual'; chars: number }
const emit = defineEmits<{ close: []; addSource: [s: Src] }>()
function emitSource(s: Src) { emit('addSource', s) }

// File
const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
function processFile(file: File) {
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  const m: Record<string,Src['type']> = { pdf:'pdf',docx:'docx',doc:'docx',xlsx:'xlsx',xls:'xlsx',txt:'txt' }
  emitSource({ id: Date.now().toString(), name: file.name, type: m[ext] || 'txt', chars: Math.floor(file.size*0.3) })
}

// Search
const searchQuery = ref('')
const searchMode = ref('web')
const searchSpeed = ref('fast')
const modeOpen = ref(false)
const speedOpen = ref(false)
const modes = [
  { v:'web', icon:'🌐', label:'Web' },
  { v:'scholar', icon:'📚', label:'Scholar' },
]
const speeds = [
  { v:'fast', icon:'⚡', label:'快速搜索' },
  { v:'deep', icon:'🔬', label:'深度研究' },
]
function doSearch() {
  if (!searchQuery.value.trim()) return
  emitSource({ id: Date.now().toString(), name: `网页: ${searchQuery.value.slice(0,25)}`, type:'web', chars:800 })
}

// Text paste
const showTextPaste = ref(false)
const textContent = ref('')
const textTitle = ref('')
function pasteText() {
  if (!textContent.value.trim()) return
  emitSource({ id: Date.now().toString(), name: textTitle.value.trim()||'文本来源', type:'manual', chars:textContent.value.length })
}
</script>

<template>
  <div class="asm-overlay" @click.self="emit('close')">
    <div class="asm-modal">
      <!-- Header -->
      <div class="asm-hdr">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
        <h2 class="asm-title">添加来源</h2>
        <button class="asm-close" @click="emit('close')">&times;</button>
      </div>

      <!-- Search -->
      <div class="asm-search-box">
        <div class="asm-search-top">
          <div class="asm-drop" :class="{ open: modeOpen }">
            <button class="asm-drop-btn" @click="modeOpen=!modeOpen; speedOpen=false">
              <span class="asm-drop-icon">{{ modes.find(m=>m.v===searchMode)?.icon }}</span>
              {{ modes.find(m=>m.v===searchMode)?.label }}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="modeOpen" class="asm-drop-menu">
              <button v-for="m in modes" :key="m.v" :class="{ active: searchMode===m.v }" @click="searchMode=m.v; modeOpen=false">{{ m.icon }} {{ m.label }}</button>
            </div>
          </div>
          <div class="asm-drop" :class="{ open: speedOpen }">
            <button class="asm-drop-btn" @click="speedOpen=!speedOpen; modeOpen=false">
              <span class="asm-drop-icon">{{ speeds.find(s=>s.v===searchSpeed)?.icon }}</span>
              {{ speeds.find(s=>s.v===searchSpeed)?.label }}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div v-if="speedOpen" class="asm-drop-menu">
              <button v-for="s in speeds" :key="s.v" :class="{ active: searchSpeed===s.v }" @click="searchSpeed=s.v; speedOpen=false">{{ s.icon }} {{ s.label }}</button>
            </div>
          </div>
        </div>
        <div class="asm-search-bar">
          <svg class="asm-search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input v-model="searchQuery" type="text" placeholder="在网络中搜索新来源..." class="asm-search-input" @keyup.enter="doSearch" />
          <button class="asm-search-btn" @click="doSearch">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 5 19 12"/></svg>
          </button>
        </div>
      </div>

      <!-- Drop zone -->
      <div class="asm-dropzone" :class="{ dragging: isDragging }" @dragover.prevent="isDragging=true" @dragleave="isDragging=false" @drop.prevent="isDragging=false; $event.dataTransfer?.files[0]&&processFile($event.dataTransfer.files[0])">
        <div class="asm-dz-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <p class="asm-dz-text">拖放文件到此处</p>
        <p class="asm-dz-hint">PDF、Word、Excel、图片、音频，等等</p>
      </div>

      <!-- Import buttons -->
      <div class="asm-imports">
        <button class="asm-imp-btn" @click="fileInput?.click()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          <span>上传文件</span>
        </button>
        <button class="asm-imp-btn" @click="showTextPaste=true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="10" y1="11" x2="14" y2="11"/></svg>
          <span>粘贴文本</span>
        </button>
      </div>

      <!-- Progress bar at bottom -->
      <div class="asm-progress">
        <div class="asm-progress-bar"><div class="asm-progress-fill" /></div>
        <span class="asm-progress-text">0 / 50</span>
      </div>
    </div>

    <input ref="fileInput" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt" hidden @change="($event.target as HTMLInputElement).files?.[0]&&processFile(($event.target as HTMLInputElement).files![0])" />

    <!-- Text paste inner modal -->
    <div v-if="showTextPaste" class="asm-overlay-inner" @click.self="showTextPaste=false">
      <div class="asm-inner">
        <h4>粘贴文本</h4>
        <label>来源名称</label>
        <input v-model="textTitle" placeholder="为这段文本命个名..." />
        <label>文本内容</label>
        <textarea v-model="textContent" placeholder="粘贴或输入文本内容..." />
        <div class="asm-inner-acts">
          <button class="asm-btn-cancel" @click="showTextPaste=false">取消</button>
          <button class="asm-btn-confirm" @click="pasteText(); showTextPaste=false; emit('close')">确认添加</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asm-overlay { position:fixed;inset:0;z-index:50;display:flex;align-items:flex-start;justify-content:center;padding-top:60px;background:rgba(27,29,26,.35);backdrop-filter:blur(4px);overflow-y:auto; }
.asm-modal { width:560px;padding:28px 32px 20px;background:var(--brand-bg-surface);border-radius:14px;box-shadow:0 0 0 1px var(--brand-border),0 12px 48px rgba(27,29,26,.08);margin-bottom:40px; }
.asm-hdr { display:flex;align-items:center;gap:10px;margin-bottom:24px;position:relative; }
.asm-title { font-family:var(--brand-font-display);font-size:17px;font-weight:600;color:var(--brand-ink-primary);margin:0;flex:1; }
.asm-close { position:absolute;right:0;top:50%;transform:translateY(-50%);width:32px;height:32px;display:flex;align-items:center;justify-content:center;background:none;border:none;font-size:20px;color:var(--brand-ink-secondary);cursor:pointer;border-radius:6px;transition:background .2s,color .2s; }
.asm-close:hover { background:var(--brand-bg-hover);color:var(--brand-ink-primary); }

/* ── Search box ── */
.asm-search-box { background:var(--brand-bg-root);border:1px solid var(--brand-border);border-radius:12px;padding:14px;margin-bottom:16px; }
.asm-search-top { display:flex;gap:8px;margin-bottom:10px; }
.asm-drop { position:relative; }
.asm-drop-btn { display:flex;align-items:center;gap:6px;padding:7px 12px;font-size:13px;font-family:var(--brand-font-body);border:1px solid var(--brand-border);border-radius:8px;background:var(--brand-bg-surface);color:var(--brand-ink-primary);cursor:pointer;transition:border-color .2s,box-shadow .2s; }
.asm-drop-btn:hover { border-color:var(--brand-accent); }
.asm-drop.open .asm-drop-btn { border-color:var(--brand-accent);box-shadow:0 0 0 2px rgba(107,155,94,.1); }
.asm-drop-icon { font-size:14px;line-height:1; }
.asm-drop-menu { position:absolute;top:calc(100% + 4px);left:0;min-width:160px;background:var(--brand-bg-surface);border:1px solid var(--brand-border);border-radius:10px;padding:4px;z-index:10;box-shadow:0 6px 24px rgba(27,29,26,.08); }
.asm-drop-menu button { display:flex;align-items:center;gap:8px;width:100%;padding:9px 12px;font-size:13px;font-family:var(--brand-font-body);background:none;border:none;border-radius:6px;color:var(--brand-ink-primary);cursor:pointer;transition:background .15s; }
.asm-drop-menu button:hover { background:var(--brand-bg-hover); }
.asm-drop-menu button.active { background:var(--brand-bg-hover);color:var(--brand-accent);font-weight:500; }
.asm-search-bar { display:flex;align-items:center;gap:8px;padding:9px 12px;background:var(--brand-bg-surface);border:1px solid var(--brand-border);border-radius:10px;transition:border-color .2s,box-shadow .2s; }
.asm-search-bar:focus-within { border-color:var(--brand-accent);box-shadow:0 0 0 2px rgba(107,155,94,.1); }
.asm-search-icon { color:var(--brand-ink-secondary);opacity:.4;flex-shrink:0; }
.asm-search-input { flex:1;border:none;outline:none;font-size:14px;font-family:var(--brand-font-body);color:var(--brand-ink-primary);background:none; }
.asm-search-input::placeholder { color:var(--brand-ink-secondary);opacity:.5; }
.asm-search-btn { display:flex;align-items:center;justify-content:center;width:34px;height:34px;border:none;border-radius:8px;background:var(--brand-accent);color:#fff;cursor:pointer;flex-shrink:0;transition:background .2s; }
.asm-search-btn:hover { background:#7DA86F; }

/* ── Drop zone ── */
.asm-dropzone { border:2px dashed var(--brand-border);border-radius:12px;padding:44px 20px;text-align:center;transition:border-color .2s,background .2s;margin-bottom:14px;cursor:default;position:relative;overflow:hidden; }
.asm-dropzone.dragging { border-color:var(--brand-accent);background:rgba(107,155,94,.04); }
.asm-dz-icon { position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--brand-accent);opacity:.06;pointer-events:none; }
.asm-dz-icon svg { width:160px;height:130px; }
.asm-dz-text { font-size:15px;font-weight:500;color:var(--brand-ink-primary);margin:0 0 4px;position:relative;z-index:1; }
.asm-dz-hint { font-size:13px;color:var(--brand-ink-secondary);margin:0;position:relative;z-index:1; }

/* ── Import buttons ── */
.asm-imports { display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px; }
.asm-imp-btn { display:flex;align-items:center;justify-content:center;gap:10px;padding:14px;font-size:14px;font-weight:500;font-family:var(--brand-font-body);border:1px solid var(--brand-border);border-radius:10px;background:var(--brand-bg-root);color:var(--brand-ink-primary);cursor:pointer;transition:border-color .2s,background .2s,box-shadow .2s; }
.asm-imp-btn:hover { border-color:var(--brand-accent);background:var(--brand-bg-hover);box-shadow:0 2px 8px rgba(27,29,26,.03); }
.asm-imp-btn svg { color:var(--brand-accent);opacity:.7;flex-shrink:0; }

/* ── Progress ── */
.asm-progress { display:flex;align-items:center;gap:10px; }
.asm-progress-bar { flex:1;height:5px;background:var(--brand-border);border-radius:3px;overflow:hidden; }
.asm-progress-fill { height:100%;width:0%;background:var(--brand-accent);border-radius:3px;transition:width .4s ease-out; }
.asm-progress-text { font-size:12px;color:var(--brand-ink-secondary);flex-shrink:0; }

/* ── Text paste inner modal ── */
.asm-overlay-inner { position:fixed;inset:0;z-index:55;display:flex;align-items:center;justify-content:center;background:rgba(27,29,26,.3);backdrop-filter:blur(4px); }
.asm-inner { width:420px;padding:28px;background:var(--brand-bg-surface);border-radius:12px;box-shadow:0 0 0 1px var(--brand-border),0 8px 40px rgba(27,29,26,.06); }
.asm-inner h4 { font-family:var(--brand-font-display);font-size:17px;font-weight:600;color:var(--brand-ink-primary);margin:0 0 18px; }
.asm-inner label { display:block;font-size:12px;font-weight:500;color:var(--brand-ink-secondary);margin-bottom:4px; }
.asm-inner input,.asm-inner textarea { width:100%;padding:10px 12px;font-size:14px;font-family:var(--brand-font-body);border:1px solid var(--brand-border);border-radius:8px;background:var(--brand-bg-root);color:var(--brand-ink-primary);outline:none;box-sizing:border-box;margin-bottom:12px;transition:border-color .2s; }
.asm-inner input:focus,.asm-inner textarea:focus { border-color:var(--brand-accent); }
.asm-inner textarea { min-height:120px;resize:vertical; }
.asm-inner-acts { display:flex;gap:8px;justify-content:flex-end;margin-top:16px; }
.asm-btn-cancel { padding:8px 18px;font-size:13px;font-family:var(--brand-font-body);border:1px solid var(--brand-border);border-radius:6px;background:none;color:var(--brand-ink-secondary);cursor:pointer;transition:background .15s; }
.asm-btn-cancel:hover { background:var(--brand-bg-hover); }
.asm-btn-confirm { padding:8px 18px;font-size:13px;font-family:var(--brand-font-body);border:none;border-radius:6px;background:var(--brand-accent);color:#fff;cursor:pointer;transition:background .15s; }
.asm-btn-confirm:hover { background:#7DA86F; }
</style>
