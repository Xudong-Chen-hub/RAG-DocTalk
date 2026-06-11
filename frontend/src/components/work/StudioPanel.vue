<script setup lang="ts">
import { ref, inject, watch } from 'vue'
import { useToast } from '@/composables/useToast'

defineProps<{ noteId: string }>()

const workStats = inject<{ sources: number; messages: number; studioFiles: number }>('workStats')
const toggleStudio = inject<() => void>('toggleStudio')
const toast = useToast()

interface StudioFile {
  id: string; name: string; type: 'audio' | 'mindmap' | 'ppt'
  createdAt: string; status: 'done' | 'generating'
  progress?: number; eta?: string
}
const files = ref<StudioFile[]>([])

// #1 sync stats
watch(() => files.value.length, (n) => { if (workStats) workStats.studioFiles = n }, { immediate: true })

// #30: Generation queue
const queue = ref<{ type: 'audio' | 'mindmap' | 'ppt'; id: string }[]>([])
const activeGenId = ref<string | null>(null)

const toolMeta: Record<string, { icon: string; label: string; desc: string; gradient: string }> = {
  audio: {
    icon: 'M2 10v3M6 6v11M10 3v18M14 8v7M18 5v13M22 10v3',
    label: '音频概述',
    desc: '转为双人播客对话',
    gradient: 'linear-gradient(135deg, #7B9EC7 0%, #6B9B5E 100%)',
  },
  mindmap: {
    icon: 'M12 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM5 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM19 19a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM12 9v5M8 17h3M14 17h3',
    label: '思维导图',
    desc: '生成结构化脑图',
    gradient: 'linear-gradient(135deg, #A48AC7 0%, #7B6BC0 100%)',
  },
  ppt: {
    icon: 'M4 6h16M4 12h16M4 18h7M2 4h20v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z',
    label: 'PPT 导出',
    desc: '生成演示文稿 .pptx',
    gradient: 'linear-gradient(135deg, #D4836A 0%, #C2544A 100%)',
  },
}

function generate(type: 'audio' | 'mindmap' | 'ppt') {
  const id = Date.now().toString()
  queue.value.push({ type, id })
  processQueue()
}

// #30: Process queue sequentially
function processQueue() {
  if (activeGenId.value || queue.value.length === 0) return
  const task = queue.value.shift()!
  activeGenId.value = task.id

  const fileId = task.id
  const type = task.type
  const names: Record<string, string> = { audio: '播客概述', mindmap: '思维导图', ppt: '演示文稿' }

  // #27: Simulate progress with realistic stages
  files.value.unshift({
    id: fileId, name: names[type], type,
    createdAt: '生成中…', status: 'generating',
    progress: 0, eta: '预计 15s',
  })

  const stages = ['分析文档结构…', '提取关键内容…', type === 'audio' ? '生成播客脚本…' : type === 'mindmap' ? '构建节点关系…' : '排版幻灯片…', '渲染输出…']
  let stageIdx = 0
  const timer = setInterval(() => {
    const f = files.value.find(x => x.id === fileId)
    if (!f) { clearInterval(timer); return }
    if (f.progress! < 100) {
      f.progress! += Math.random() * 8 + 3
      if (f.progress! > 100) f.progress = 100
      const si = Math.min(stages.length - 1, Math.floor(f.progress! / 25))
      if (si !== stageIdx) { stageIdx = si; f.createdAt = stages[si] }
      f.eta = f.progress! > 90 ? '即将完成…' : `预计 ${Math.ceil((100 - f.progress!) / 7)}s`
    } else {
      f.status = 'done'
      f.createdAt = '刚刚'
      f.eta = undefined
      clearInterval(timer)
      activeGenId.value = null
      toast.success(`${names[type]} 已生成`)
      processQueue() // next in queue
    }
  }, 300)
}

// #28: Audio player state
const playingFileId = ref<string | null>(null)
const audioProgress = ref(0)
let audioTimer: ReturnType<typeof setInterval> | null = null
function toggleAudio(fileId: string) {
  if (playingFileId.value === fileId) {
    playingFileId.value = null
    audioProgress.value = 0
    if (audioTimer) { clearInterval(audioTimer); audioTimer = null }
  } else {
    playingFileId.value = fileId
    audioProgress.value = 0
    audioTimer = setInterval(() => {
      audioProgress.value += 0.5
      if (audioProgress.value >= 100) {
        audioProgress.value = 100
        playingFileId.value = null
        if (audioTimer) { clearInterval(audioTimer); audioTimer = null }
      }
    }, 200)
  }
}

// #29: Mindmap preview toggle
const previewMindmapId = ref<string | null>(null)

// #32: Share
function shareFile(f: StudioFile) {
  navigator.clipboard.writeText(`Studio 文件: ${f.name}`).then(() => {
    toast.success('链接已复制')
  })
}
</script>

<template>
  <div class="studio-panel">
    <div class="st-header">
      <span class="st-title">Studio</span>
      <div class="st-header-right">
        <!-- #30: Queue indicator -->
        <span v-if="queue.length > 0" class="st-queue-badge">{{ queue.length }} 个待生成</span>
        <button class="st-collapse-btn" title="折叠面板" @click="toggleStudio?.()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
    </div>

    <!-- #26: Enhanced tool cards -->
    <div class="st-tools">
      <button
        v-for="(meta, type) in toolMeta"
        :key="type"
        class="st-tool"
        :class="{ busy: !!activeGenId }"
        :title="meta.desc"
        @click="generate(type as 'audio'|'mindmap'|'ppt')"
      >
        <div class="st-tool-top">
          <div class="st-tool-icon-box" :style="{ background: meta.gradient }">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path :d="meta.icon" />
            </svg>
          </div>
          <div class="st-tool-text">
            <span class="st-tool-label">{{ meta.label }}</span>
            <span class="st-tool-desc">{{ meta.desc }}</span>
          </div>
        </div>
      </button>
    </div>

    <!-- #30: Queue visualization -->
    <div v-if="queue.length > 0" class="st-queue-info">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
      排队中：{{ queue.map(q => toolMeta[q.type]?.label).join('、') }}
    </div>

    <!-- File list -->
    <div class="st-files">
      <span class="st-files-title">生成文件</span>
      <div v-if="files.length === 0" class="st-empty">
        <div class="st-empty-icon-box">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
        </div>
        <p class="st-empty-title">多模态输出</p>
        <p class="st-empty-desc">将文档内容转为播客音频、思维导图或演示文稿。点击上方工具开始生成。</p>
      </div>
      <div v-for="f in files" :key="f.id" class="st-file" :class="{ generating: f.status === 'generating' }">
        <!-- Type icon with color -->
        <svg v-if="f.type === 'audio'" class="st-file-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" stroke-width="1.6"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
        <svg v-else-if="f.type === 'mindmap'" class="st-file-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#A48AC7" stroke-width="1.6"><circle cx="12" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><path d="M12 7v5M7 17h4M14 17h4"/></svg>
        <svg v-else class="st-file-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D4836A" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/></svg>
        <div class="st-file-info">
          <span class="st-file-name">{{ f.name }}</span>
          <!-- #27: Progress bar -->
          <div v-if="f.status === 'generating' && f.progress !== undefined" class="st-file-progress-wrap">
            <div class="st-file-progress"><div class="st-file-progress-fill" :style="{ width: f.progress + '%' }" /></div>
            <span class="st-file-eta">{{ f.eta || f.createdAt }}</span>
          </div>
          <span v-else class="st-file-meta">{{ f.createdAt }}</span>
        </div>
        <!-- Actions -->
        <div class="st-file-actions">
          <!-- #28: Inline audio player -->
          <button v-if="f.type === 'audio' && f.status === 'done'" class="st-file-play" @click="toggleAudio(f.id)">
            <svg v-if="playingFileId !== f.id" width="14" height="14" viewBox="0 0 24 24" fill="var(--brand-accent)" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="var(--brand-accent)" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
          </button>
          <!-- #29: Mindmap preview toggle -->
          <button v-if="f.type === 'mindmap' && f.status === 'done'" class="st-file-preview-btn" @click="previewMindmapId = previewMindmapId === f.id ? null : f.id" title="预览">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="2"/><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/></svg>
          </button>
          <!-- #32: Download & Share -->
          <button v-if="f.status === 'done'" class="st-file-dl" title="下载">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
          <button v-if="f.status === 'done'" class="st-file-share" title="复制链接" @click="shareFile(f)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
          </button>
        </div>
      </div>

      <!-- #28: Audio player bar -->
      <div v-if="playingFileId" class="st-audio-bar">
        <div class="st-audio-progress">
          <div class="st-audio-progress-fill" :style="{ width: audioProgress + '%' }" />
          <div class="st-audio-thumb" :style="{ left: audioProgress + '%' }" />
        </div>
        <span class="st-audio-time">{{ Math.floor(audioProgress * 1.8) }}s / 3:00</span>
      </div>

      <!-- #29: Mindmap preview -->
      <div v-if="previewMindmapId" class="st-mindmap-preview">
        <div class="st-mindmap-preview-header">
          <span>思维导图预览</span>
          <button @click="previewMindmapId = null">&times;</button>
        </div>
        <div class="st-mindmap-placeholder">
          <svg width="100%" height="140" viewBox="0 0 300 140" fill="none">
            <circle cx="150" cy="70" r="22" fill="rgba(107,155,94,0.12)" stroke="var(--brand-accent)" stroke-width="1.5"/>
            <text x="150" y="74" text-anchor="middle" font-size="10" fill="var(--brand-ink-primary)" font-family="sans-serif">主主题</text>
            <line x1="130" y1="62" x2="80" y2="30" stroke="var(--brand-border)" stroke-width="1"/>
            <line x1="128" y1="75" x2="50" y2="80" stroke="var(--brand-border)" stroke-width="1"/>
            <line x1="130" y1="78" x2="80" y2="115" stroke="var(--brand-border)" stroke-width="1"/>
            <line x1="170" y1="62" x2="220" y2="30" stroke="var(--brand-border)" stroke-width="1"/>
            <line x1="172" y1="75" x2="250" y2="80" stroke="var(--brand-border)" stroke-width="1"/>
            <circle cx="78" cy="28" r="14" fill="rgba(164,138,199,0.1)" stroke="#A48AC7" stroke-width="1"/>
            <circle cx="48" cy="80" r="14" fill="rgba(123,158,199,0.1)" stroke="#7B9EC7" stroke-width="1"/>
            <circle cx="78" cy="117" r="14" fill="rgba(212,131,106,0.1)" stroke="#D4836A" stroke-width="1"/>
            <circle cx="222" cy="28" r="14" fill="rgba(107,155,94,0.1)" stroke="var(--brand-accent)" stroke-width="1"/>
            <circle cx="252" cy="80" r="14" fill="rgba(164,138,199,0.1)" stroke="#A48AC7" stroke-width="1"/>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.studio-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--panel-padding);
  background: var(--brand-bg-surface);
  border-radius: var(--panel-radius);
}
.st-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 14px;
}
.st-header-right { display: flex; align-items: center; gap: 8px; }
.st-title {
  font-family: var(--brand-font-display);
  font-size: 16px; font-weight: 600;
  color: var(--brand-ink-primary);
}
.st-collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: none; border-radius: 6px;
  background: none;
  color: var(--brand-ink-secondary);
  cursor: pointer;
  transition: background 150ms, color 150ms;
}
.st-collapse-btn:hover { background: var(--brand-bg-hover); color: var(--brand-ink-primary); }
/* #30: Queue badge */
.st-queue-badge {
  font-size: 11px; font-weight: 500;
  color: var(--brand-accent);
  background: rgba(107,155,94,0.1);
  padding: 3px 8px; border-radius: 10px;
}

/* #26: Enhanced tool cards */
.st-tools { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.st-tool {
  display: flex; flex-direction: column;
  padding: 14px;
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  background: var(--brand-bg-surface);
  cursor: pointer;
  text-align: left;
  transition: border-color 200ms, background 200ms, box-shadow 200ms;
}
.st-tool:hover {
  border-color: var(--brand-accent);
  background: var(--brand-bg-hover);
  box-shadow: 0 2px 8px rgba(27,29,26,0.03);
}
.st-tool.busy { border-color: var(--brand-accent); box-shadow: 0 0 0 2px rgba(107,155,94,.08); }
.st-tool-top { display: flex; align-items: center; gap: 12px; }
.st-tool-icon-box {
  width: 38px; height: 38px;
  border-radius: 9px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.st-tool-icon-box svg { opacity: 0.95; }
.st-tool-text { flex: 1; min-width: 0; }
.st-tool-label { font-size: 14px; font-weight: 500; color: var(--brand-ink-primary); display: block; }
.st-tool-desc { font-size: 12px; color: var(--brand-ink-secondary); display: block; margin-top: 1px; }

/* #30: Queue info */
.st-queue-info {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; margin-bottom: 14px;
  font-size: 12px; color: var(--brand-accent);
  background: rgba(107,155,94,0.06);
  border-radius: 8px;
}
.st-queue-info svg { opacity: 0.6; animation: spin 2s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Files */
.st-files { flex: 1; overflow-y: auto; }
.st-files-title {
  font-size: 13px; font-weight: 600;
  color: var(--brand-ink-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
  display: block;
}
.st-empty { text-align: center; padding: 32px 16px; }
.st-empty-icon-box {
  color: var(--brand-accent); opacity: 0.2;
  margin-bottom: 16px;
}
.st-empty-title {
  font-family: var(--brand-font-display);
  font-size: 15px; font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 6px;
}
.st-empty-desc {
  font-size: 13px; color: var(--brand-ink-secondary);
  line-height: 1.6;
  margin: 0;
}
.st-file {
  display: flex; align-items: center; gap: 10px;
  padding: 10px; border-radius: 8px;
  transition: background 150ms;
}
.st-file:hover { background: var(--brand-bg-hover); }
.st-file.generating { background: rgba(107,155,94,0.03); }
.st-file-icon { flex-shrink: 0; }
.st-file-info { flex: 1; min-width: 0; }
.st-file-name { display: block; font-size: 13px; color: var(--brand-ink-primary); }
.st-file-meta { display: block; font-size: 11px; color: var(--brand-ink-secondary); margin-top: 2px; }
/* #27: Progress */
.st-file-progress-wrap { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.st-file-progress { flex: 1; height: 3px; background: var(--brand-border); border-radius: 2px; overflow: hidden; }
.st-file-progress-fill { height: 100%; background: var(--brand-accent); border-radius: 2px; transition: width .3s ease-out; }
.st-file-eta { font-size: 10px; color: var(--brand-accent); flex-shrink: 0; }

/* File actions */
.st-file-actions { display: flex; gap: 2px; flex-shrink: 0; opacity: 0; transition: opacity 150ms; }
.st-file:hover .st-file-actions { opacity: 1; }
.st-file-dl, .st-file-play, .st-file-share, .st-file-preview-btn {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; background: none; border: none;
  color: var(--brand-ink-secondary); cursor: pointer;
  border-radius: 5px; transition: background 150ms, color 150ms;
}
.st-file-dl:hover, .st-file-play:hover, .st-file-share:hover, .st-file-preview-btn:hover {
  background: var(--brand-bg-hover); color: var(--brand-accent);
}

/* #28: Audio player bar */
.st-audio-bar {
  display: flex; align-items: center; gap: 10px;
  margin-top: 8px; padding: 8px 12px;
  background: var(--brand-bg-hover);
  border-radius: 8px;
}
.st-audio-progress {
  flex: 1; height: 4px;
  background: var(--brand-border);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
}
.st-audio-progress-fill {
  height: 100%; background: var(--brand-accent);
  border-radius: 2px;
  transition: width .2s linear;
}
.st-audio-thumb {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  width: 10px; height: 10px;
  background: var(--brand-accent);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,.15);
}
.st-audio-time { font-size: 11px; color: var(--brand-ink-secondary); flex-shrink: 0; }

/* #29: Mindmap preview */
.st-mindmap-preview {
  margin-top: 8px;
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  overflow: hidden;
}
.st-mindmap-preview-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px;
  background: var(--brand-bg-hover);
  font-size: 12px; font-weight: 500; color: var(--brand-ink-secondary);
}
.st-mindmap-preview-header button {
  background: none; border: none; font-size: 18px;
  color: var(--brand-ink-secondary); cursor: pointer;
  line-height: 1; padding: 0 2px;
}
.st-mindmap-placeholder {
  padding: 16px; display: flex; justify-content: center;
  background: var(--brand-bg-surface);
}
</style>
