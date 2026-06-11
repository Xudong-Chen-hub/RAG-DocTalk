<script setup lang="ts">
import { ref, nextTick, watch, inject, computed } from 'vue'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'
import { useToast } from '@/composables/useToast'

defineProps<{ noteId: string }>()

const workStats = inject<{ sources: number; messages: number; studioFiles: number }>('workStats')
const toast = useToast()

interface Message {
  id: string; role: 'user' | 'assistant'
  content: string; citations?: { id: string; text: string; source: string }[]
  streaming?: boolean; timestamp: number
}
const messages = ref<Message[]>([])

// #1: sync stats
watch(() => messages.value.length, () => {
  if (workStats) workStats.messages = Math.floor(messages.value.length / 2)
}, { immediate: true })

const inputText = ref('')
const activeCitation = ref<string | null>(null)
const msgContainer = ref<HTMLElement | null>(null)
const userScrolledUp = ref(false)
const streamingMsgId = ref<string | null>(null)

function onScroll() {
  if (!msgContainer.value) return
  const el = msgContainer.value
  userScrolledUp.value = el.scrollTop + el.clientHeight < el.scrollHeight - 80
}

function scrollToBottom(force = false) {
  nextTick(() => {
    if (!msgContainer.value) return
    if (force || !userScrolledUp.value) {
      msgContainer.value.scrollTo({ top: msgContainer.value.scrollHeight, behavior: 'smooth' })
    }
  })
}

// #22: Auto-resize textarea
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const inputFocused = ref(false)
function autoResize() {
  nextTick(() => {
    const el = textareaRef.value
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  })
}

function send() {
  const text = inputText.value.trim()
  if (!text) return
  // #23: Timestamp
  messages.value.push({ id: Date.now().toString(), role: 'user', content: text, timestamp: Date.now() })
  inputText.value = ''
  userScrolledUp.value = false
  autoResize()

  // Mock streaming AI response
  const msgId = (Date.now() + 1).toString()
  streamingMsgId.value = msgId
  const fullText = '根据合同第三章第2条，本合同有效期为**2026年1月1日至2027年12月31日**。\n\n在此期间双方应按照约定履行以下义务：\n\n1. 按时支付合同款项\n2. 遵守保密条款\n3. 按约定交付成果\n\n> ⚠️ 注意：违反合同条款可能面临违约赔偿。'
  const citations = [
    { id: 'c1', text: '本合同有效期为2026年1月1日至2027年12月31日。', source: '合同文件.pdf · 第3章' },
    { id: 'c2', text: '双方应在合同期内严格遵守本协议约定的各项条款。', source: '合同文件.pdf · 第3章' },
  ]

  messages.value.push({ id: msgId, role: 'assistant', content: '', citations: undefined, streaming: true, timestamp: Date.now() })
  scrollToBottom(true)

  let i = 0
  const streamTimer = setInterval(() => {
    i++
    const msg = messages.value.find(m => m.id === msgId)
    if (!msg) { clearInterval(streamTimer); streamingMsgId.value = null; return }
    msg.content = fullText.slice(0, i)
    if (i >= fullText.length) {
      msg.streaming = false
      msg.citations = citations
      clearInterval(streamTimer)
      streamingMsgId.value = null
    }
    scrollToBottom()
  }, 40)
}

// #17: Copy message
function copyMessage(msg: Message) {
  navigator.clipboard.writeText(msg.content).then(() => {
    toast.success('已复制到剪贴板')
  })
}

// #17: Regenerate
function regenerate() {
  // Remove last assistant message and re-send
  const msgs = messages.value
  if (msgs.length < 2) return
  const last = msgs[msgs.length - 1]
  if (last.role === 'assistant') {
    msgs.pop()
    // Re-send the last user message
    const lastUser = msgs[msgs.length - 1]
    if (lastUser?.role === 'user') {
      inputText.value = lastUser.content
      send()
    }
  }
}

// #23: Format timestamp
function fmtTime(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  return new Date(ts).toLocaleDateString('zh-CN', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
}

const isEmpty = computed(() => messages.value.length === 0)

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
}

watch(() => messages.value.length, () => scrollToBottom(true))
</script>

<template>
  <div class="community-panel">
    <!-- #24: Context info bar -->
    <div v-if="!isEmpty" class="cp-context-bar">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
      基于 {{ workStats?.sources || 0 }} 个来源回答
    </div>

    <!-- Empty state -->
    <div v-if="isEmpty" class="cp-empty-wrapper">
      <div class="cp-empty">
        <!-- #20: Minimal sonar-ripple logo -->
        <div class="cp-empty-logo">
          <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Ripple 1 — outermost, delayed -->
            <circle cx="36" cy="36" r="4" stroke="var(--brand-accent)" stroke-width="1" opacity="0" class="cp-ripple cp-ripple-1" />
            <!-- Ripple 2 — middle -->
            <circle cx="36" cy="36" r="4" stroke="var(--brand-accent)" stroke-width="1.2" opacity="0" class="cp-ripple cp-ripple-2" />
            <!-- Ripple 3 — innermost, fastest -->
            <circle cx="36" cy="36" r="4" stroke="var(--brand-accent)" stroke-width="1" opacity="0" class="cp-ripple cp-ripple-3" />
            <!-- Core glow -->
            <circle cx="36" cy="36" r="12" fill="var(--brand-accent)" opacity="0.08" class="cp-core-glow" />
            <!-- Core ring -->
            <circle cx="36" cy="36" r="8" stroke="var(--brand-accent)" stroke-width="1.6" opacity="0.35" />
            <!-- Center dot -->
            <circle cx="36" cy="36" r="3" fill="var(--brand-accent)" opacity="0.55" class="cp-core-dot" />
          </svg>
        </div>
        <h3 class="cp-empty-title">让我们开始构建你的知识库</h3>
        <p class="cp-empty-desc">在左侧添加文档来源后，你可以在这里提问。AI 会基于你的文档内容给出有据可查的回答。</p>
        <div class="cp-suggestions">
          <span class="cp-sugg-label">试着这样问：</span>
          <button class="cp-sugg" @click="inputText = '总结这份文档的主要内容'">总结这份文档的主要内容</button>
          <button class="cp-sugg" @click="inputText = '文档中提到了哪些关键数据'">文档中提到了哪些关键数据</button>
          <button class="cp-sugg" @click="inputText = '这份合同有哪些需要注意的条款'">这份合同有哪些需要注意的条款</button>
        </div>
      </div>
    </div>

    <!-- Messages (scrollable) -->
    <div v-else ref="msgContainer" class="cp-messages" @scroll="onScroll">
      <div v-for="msg in messages" :key="msg.id" class="cp-msg-wrap" :class="msg.role">
        <div class="cp-msg" :class="msg.role">
          <div class="cp-msg-bubble" :class="{ streaming: msg.streaming }">
            <!-- #19: Markdown rendering for assistant messages -->
            <div v-if="msg.role === 'assistant' && !msg.streaming" class="cp-msg-text">
              <MarkdownRenderer :content="msg.content" />
            </div>
            <div v-else class="cp-msg-text">
              {{ msg.content }}
              <span v-if="msg.streaming" class="cp-cursor" />
            </div>
            <!-- Citations -->
            <div v-if="msg.citations" class="cp-cites">
              <button
                v-for="(c, ci) in msg.citations"
                :key="c.id"
                class="cp-cite"
                :class="{ active: activeCitation === c.id }"
                @click="activeCitation = activeCitation === c.id ? null : c.id"
              >
                [{{ ci + 1 }}]
              </button>
            </div>
          </div>
          <!-- #23: Timestamp -->
          <span class="cp-msg-time">{{ fmtTime(msg.timestamp) }}</span>
        </div>
        <!-- Citation popover -->
        <div v-if="msg.citations" class="cp-cite-pop">
          <div
            v-for="c in msg.citations"
            v-show="activeCitation === c.id"
            :key="c.id"
            class="cp-cite-card"
          >
            <div class="cp-cite-src">{{ c.source }}</div>
            <div class="cp-cite-txt">{{ c.text }}</div>
          </div>
        </div>

        <!-- #17: Action buttons on assistant messages (not streaming) -->
        <div v-if="msg.role === 'assistant' && !msg.streaming" class="cp-msg-actions">
          <button class="cp-msg-act" title="复制" @click="copyMessage(msg)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          </button>
          <button class="cp-msg-act" title="重新生成" @click="regenerate">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          </button>
        </div>
      </div>

      <!-- #18: Scroll-to-bottom floating button -->
      <button v-if="userScrolledUp" class="cp-scroll-bottom" @click="scrollToBottom(true)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>

    <!-- Input -->
    <div class="cp-input-area">
      <div class="cp-input-wrap">
        <textarea
          ref="textareaRef"
          v-model="inputText"
          class="cp-input"
          placeholder="向你的文档提问..."
          rows="1"
          @keydown="onKeydown"
          @input="autoResize"
          @focus="inputFocused = true"
          @blur="inputFocused = false"
        />
        <button class="cp-send" :class="{ active: inputFocused || inputText.trim() }" @click="send" :disabled="!!streamingMsgId">
          <svg v-if="!streamingMsgId" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
          <span v-else class="cp-stop-icon" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.community-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--brand-bg-surface) !important;
  border-radius: var(--panel-radius);
}

/* #24: Context bar */
.cp-context-bar {
  display: flex; align-items: center; gap: 6px;
  margin: 10px 24px 0;
  padding: 8px 14px;
  font-size: 12px; color: var(--brand-ink-secondary);
  background: var(--brand-bg-hover);
  border-radius: 8px;
}

/* Messages container */
.cp-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 32px;
  scroll-behavior: smooth;
  background: var(--brand-bg-surface);
  position: relative;
}

/* #25: Message entrance animation */
.cp-msg-wrap {
  margin-bottom: 14px;
  animation: msgSlideUp 350ms ease-out both;
}
.cp-msg-wrap.user { display: flex; flex-direction: column; align-items: flex-end; }
.cp-msg-wrap.assistant { display: flex; flex-direction: column; align-items: flex-start; }
.cp-msg { display: flex; flex-direction: column; }
.cp-msg.user { align-items: flex-end; }
.cp-msg.assistant { align-items: flex-start; }
.cp-msg-bubble {
  max-width: 82%;
  padding: 12px 18px;
  border-radius: 14px;
  line-height: 1.7;
}
.cp-msg.user .cp-msg-bubble {
  background: var(--brand-bubble-user);
  border-top-right-radius: 4px;
}
.cp-msg.assistant .cp-msg-bubble {
  background: var(--brand-bubble-ai);
  border: 1px solid var(--brand-border);
  border-top-left-radius: 4px;
}
.cp-msg-text { font-size: 15px; color: var(--brand-ink-primary); }
.cp-cursor {
  display: inline-block;
  width: 2px; height: 1em;
  background: var(--brand-accent);
  vertical-align: text-bottom;
  margin-left: 1px;
  animation: cursorBlink 0.8s ease-in-out infinite;
}
@keyframes cursorBlink { 0%,100%{opacity:1} 50%{opacity:0} }
.cp-msg-bubble.streaming {
  position: relative;
  overflow: hidden;
}
.cp-msg-bubble.streaming::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg,
    transparent 60%,
    rgba(107,155,94,0.03) 80%,
    transparent 100%
  );
  animation: streamShimmer 1.5s ease-in-out infinite;
}
@keyframes streamShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* #23: Timestamp */
.cp-msg-time {
  font-size: 10px; color: var(--brand-ink-secondary);
  opacity: 0.5; margin-top: 3px;
  padding: 0 4px;
}

/* #17: Message actions */
.cp-msg-actions {
  display: flex; gap: 4px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 200ms;
}
.cp-msg-wrap:hover .cp-msg-actions { opacity: 1; }
.cp-msg-act {
  display: flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  background: var(--brand-bg-surface);
  color: var(--brand-ink-secondary);
  cursor: pointer;
  transition: background 150ms, color 150ms, border-color 150ms;
}
.cp-msg-act:hover { background: var(--brand-bg-hover); color: var(--brand-accent); border-color: var(--brand-accent); }

/* Citations */
.cp-cites { display: flex; gap: 6px; margin-top: 8px; }
.cp-cite {
  padding: 2px 8px;
  font-size: 12px; font-weight: 600;
  font-family: var(--brand-font-body);
  border: 1px solid var(--brand-accent);
  border-radius: 4px; background: none;
  color: var(--brand-accent); cursor: pointer;
  transition: background 200ms, color 200ms, transform 200ms;
  animation: citePopIn 350ms ease-out both;
}
.cp-cite:hover, .cp-cite.active { background: var(--brand-accent); color: #fff; }
.cp-cite-pop { margin-top: 6px; }
.cp-cite-card {
  max-width: 340px;
  padding: 12px 14px;
  background: var(--brand-bg-surface);
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(27,29,26,0.04);
}
.cp-cite-src { font-size: 11px; font-weight: 600; color: var(--brand-ink-secondary); margin-bottom: 6px; }
.cp-cite-txt {
  font-size: 14px; color: var(--brand-ink-primary);
  font-family: var(--brand-font-display);
  line-height: 1.7;
  padding: 2px 0;
  background: linear-gradient(transparent 60%, var(--brand-cite-highlight) 60%);
}

/* #18: Scroll-to-bottom button */
.cp-scroll-bottom {
  position: sticky; bottom: 8px;
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 34px; margin: 0 auto;
  border: 1px solid var(--brand-border);
  border-radius: 50%;
  background: var(--brand-bg-surface);
  color: var(--brand-ink-secondary);
  cursor: pointer;
  box-shadow: 0 2px 10px rgba(27,29,26,0.06);
  transition: background 200ms, color 200ms, transform 200ms;
  animation: msgSlideUp 250ms ease-out both;
}
.cp-scroll-bottom:hover { background: var(--brand-bg-hover); color: var(--brand-accent); transform: translateY(-2px); }

/* Empty wrapper */
.cp-empty-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow-y: auto;
}
/* #20: Enhanced empty state */
.cp-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 0 24px;
}
.cp-empty-logo {
  margin-bottom: 28px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* ── Sonar ripples ── */
.cp-ripple {
  transform-origin: 36px 36px;
}
.cp-ripple-1 { animation: sonarRipple 3s ease-out infinite; }
.cp-ripple-2 { animation: sonarRipple 3s ease-out 0.6s infinite; }
.cp-ripple-3 { animation: sonarRipple 3s ease-out 1.2s infinite; }

@keyframes sonarRipple {
  0%   { r: 4; opacity: 0.5; stroke-width: 1.8; }
  60%  { opacity: 0.15; }
  100% { r: 32; opacity: 0; stroke-width: 0.3; }
}
/* ── Core breathing glow ── */
.cp-core-glow {
  transform-origin: 36px 36px;
  animation: coreBreath 2.6s ease-in-out infinite;
}
@keyframes coreBreath {
  0%, 100% { r: 12; opacity: 0.06; }
  50%      { r: 16; opacity: 0.14; }
}
/* ── Center dot subtle pulse ── */
.cp-core-dot {
  transform-origin: 36px 36px;
  animation: dotPulse 2s ease-in-out infinite;
}
@keyframes dotPulse {
  0%, 100% { r: 3; opacity: 0.45; }
  50%      { r: 3.8; opacity: 0.7; }
}
.cp-empty-title {
  font-family: var(--brand-font-display);
  font-size: 22px; font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 10px;
}
.cp-empty-desc {
  font-size: 14px; color: var(--brand-ink-secondary);
  margin: 0 0 32px;
  max-width: 380px;
  line-height: 1.6;
}
.cp-suggestions { display: flex; flex-direction: column; gap: 8px; align-items: center; }
.cp-sugg-label { font-size: 12px; color: var(--brand-ink-secondary); opacity: 0.6; margin-bottom: 4px; }
.cp-sugg {
  padding: 10px 20px;
  font-size: 14px; font-family: var(--brand-font-body);
  border: 1px solid var(--brand-border);
  border-radius: 20px; background: var(--brand-bg-surface);
  color: var(--brand-ink-secondary); cursor: pointer;
  transition: border-color 200ms, color 200ms, background 200ms;
  width: 100%; max-width: 360px;
}
.cp-sugg:hover { border-color: var(--brand-accent); color: var(--brand-accent); background: var(--brand-bg-hover); }

/* Input */
.cp-input-area {
  padding: 12px 40px 20px;
  display: flex;
  justify-content: center;
  background: var(--brand-bg-surface);
  flex-shrink: 0;
}
.cp-input-wrap {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  width: 100%; max-width: 640px;
  border: 1px solid var(--brand-border);
  border-radius: 14px;
  background: var(--brand-bg-surface);
  transition: border-color 200ms, box-shadow 200ms;
}
.cp-input-wrap:focus-within {
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 3px rgba(107,155,94,0.08);
}
.cp-input {
  flex: 1;
  border: none; outline: none;
  font-size: 15px; font-family: var(--brand-font-body);
  color: var(--brand-ink-primary);
  background: none;
  resize: none;
  max-height: 140px;
  line-height: 1.5;
  padding: 6px 0;
  align-self: center;
}
.cp-input::placeholder { color: var(--brand-ink-secondary); opacity: 0.45; }
.cp-send {
  width: 34px; height: 34px;
  display: flex; align-items: center; justify-content: center;
  border: none; border-radius: 8px;
  background: var(--brand-border);
  color: #fff;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 200ms, transform 200ms;
}
.cp-send.active { background: var(--brand-accent); }
.cp-send.active:hover { background: #7DA86F; transform: scale(1.05); }
.cp-send:disabled { cursor: not-allowed; opacity: 0.6; }
.cp-stop-icon {
  width: 10px; height: 10px;
  background: #fff;
  border-radius: 2px;
}
</style>
