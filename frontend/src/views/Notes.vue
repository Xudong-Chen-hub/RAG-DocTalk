<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePrefsStore } from '@/stores/prefs'
import LoginModal from '@/components/LoginModal.vue'
import logoUrl from '@/assets/logo.svg'

const router = useRouter()
const auth = useAuthStore()
const prefs = usePrefsStore()
const showShortcuts = ref(false)

const showLogin = ref(false)
const searchQuery = ref('')
const darkMode = ref(false)
const activeNav = ref<'all' | 'starred' | 'settings'>('all')

// mock notes data — with preview snippets
const notes = ref([
  { id: '1', title: '项目报告', conversations: 3, updatedAt: '昨天', docType: 'pdf', starred: true, preview: '本报告详细分析了2026年Q2的项目进展情况，涵盖预算执行、里程碑达成、风险评估…' },
  { id: '2', title: '合同法笔记', conversations: 12, updatedAt: '2小时前', docType: 'docx', starred: false, preview: '合同是平等主体之间设立、变更、终止民事权利义务关系的协议。依法成立的合同受法律保护…' },
  { id: '3', title: '论文文献综述', conversations: 8, updatedAt: '6月5日', docType: 'txt', starred: true, preview: '近年来RAG技术在文档问答领域取得了显著进展，检索增强生成已成为企业级应用的主流方案…' },
  { id: '4', title: '读书笔记', conversations: 5, updatedAt: '上周', docType: 'pdf', starred: false, preview: '第一章介绍了系统设计的基本原则，包括模块化、抽象、分层等核心概念的详细阐述与案例分析…' },
])

// P0: Pressing feedback
const pressingCardId = ref<string | null>(null)

// P1b: Menu state
const menuNoteId = ref<string | null>(null)
const renamingNoteId = ref<string | null>(null)
const renameText = ref('')

function toggleStar(id: string) {
  const note = notes.value.find(n => n.id === id)
  if (note) note.starred = !note.starred
  menuNoteId.value = null
}
function startRename(id: string) {
  const note = notes.value.find(n => n.id === id)
  if (note) { renameText.value = note.title; renamingNoteId.value = id }
  menuNoteId.value = null
  nextTick(() => {
    const input = document.querySelector('.rename-input') as HTMLInputElement
    input?.focus()
    input?.select()
  })
}
function confirmRename() {
  if (!renamingNoteId.value || !renameText.value.trim()) return
  const note = notes.value.find(n => n.id === renamingNoteId.value)
  if (note) note.title = renameText.value.trim()
  renamingNoteId.value = null
}
function deleteNote(id: string) {
  notes.value = notes.value.filter(n => n.id !== id)
  menuNoteId.value = null
}
function closeMenu() { menuNoteId.value = null }

if (typeof document !== 'undefined') {
  document.addEventListener('click', closeMenu)
}

const starredNotes = computed(() => notes.value.filter(n => n.starred))
const filteredNotes = computed(() => {
  const pool = activeNav.value === 'starred' ? starredNotes.value : notes.value
  if (!searchQuery.value) return pool
  const q = searchQuery.value.toLowerCase()
  return pool.filter(n =>
    n.title.toLowerCase().includes(q) ||
    (n.preview && n.preview.toLowerCase().includes(q))
  )
})

function goToWork(noteId: string, title: string) {
  router.push({ path: `/work/${noteId}`, query: { title } })
}

function onCardMove(e: MouseEvent) {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width - 0.5
  const y = (e.clientY - rect.top) / rect.height - 0.5
  card.style.setProperty('--tilt-x', (y * 14).toFixed(1))
  card.style.setProperty('--tilt-y', (x * -14).toFixed(1))
}
function onCardLeave(e: MouseEvent) {
  const card = e.currentTarget as HTMLElement
  card.style.setProperty('--tilt-x', '0')
  card.style.setProperty('--tilt-y', '0')
  pressingCardId.value = null
}

function createNote() {
  const id = Date.now().toString()
  notes.value.unshift({
    id,
    title: '未命名的笔记',
    conversations: 0,
    updatedAt: '刚刚',
    docType: 'txt',
    starred: false,
    preview: '',
  })
  goToWork(id, '未命名的笔记')
}

function toggleDark() {
  darkMode.value = !darkMode.value
  document.documentElement.classList.toggle('dark', darkMode.value)
  localStorage.setItem('darkMode', darkMode.value ? '1' : '0')
}

// restore dark mode preference
const savedDark = localStorage.getItem('darkMode')
if (savedDark === '1') {
  darkMode.value = true
  document.documentElement.classList.add('dark')
}
</script>

<template>
  <div class="notes-app">
    <LoginModal v-if="showLogin" @close="showLogin = false" />

    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <router-link to="/" class="sb-logo">
          <img :src="logoUrl" alt="RAG-DocTalk" class="sb-logo-img" />
          <span class="sb-logo-text">RAG-DocTalk</span>
        </router-link>

        <div class="sb-user" v-if="auth.user">
          <div class="sb-avatar">{{ auth.user.name.charAt(0) }}</div>
          <div class="sb-user-info">
            <span class="sb-user-name">{{ auth.user.name }}</span>
            <span class="sb-user-email">{{ auth.user.email }}</span>
          </div>
        </div>

        <nav class="sb-nav">
          <button class="sb-nav-item" :class="{ active: activeNav === 'all' }" @click="activeNav = 'all'">
            <svg class="sb-nav-icon sb-icon-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <svg class="sb-nav-icon sb-icon-filled" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z"/></svg>
            所有笔记
          </button>
          <button class="sb-nav-item" :class="{ active: activeNav === 'starred' }" @click="activeNav = 'starred'">
            <svg class="sb-nav-icon sb-icon-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <svg class="sb-nav-icon sb-icon-filled" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            收藏
          </button>
          <button class="sb-nav-item" :class="{ active: activeNav === 'settings' }" @click="activeNav = 'settings'">
            <svg class="sb-nav-icon sb-icon-outline" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <svg class="sb-nav-item sb-icon-filled" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4 0h.09a1.65 1.65 0 0 1 1.51 1 2 2 0 0 1-2 2 2 2 0 0 1-2-2 1.65 1.65 0 0 1 .33-1.82l.06-.06a2 2 0 0 0 0-2.83l-.06-.06A1.65 1.65 0 0 1 19.4 9h-.09A1.65 1.65 0 0 1 17.8 7.6a1.65 1.65 0 0 1 .33-1.82l.06-.06a2 2 0 0 0-2.83-2.83l-.06.06A1.65 1.65 0 0 1 13.48 2.6 1.65 1.65 0 0 1 12 1a2 2 0 0 0-2 2v.09a1.65 1.65 0 0 1-1.51 1 1.65 1.65 0 0 1-1.82-.33l-.06-.06a2 2 0 0 0-2.83 2.83l.06.06A1.65 1.65 0 0 1 4.6 9h-.09A1.65 1.65 0 0 1 3 10.52 2 2 0 0 0 5 12.52h.09a1.65 1.65 0 0 1 1.51 1 1.65 1.65 0 0 1-.33 1.82l-.06.06a2 2 0 0 0 2.83 2.83l.06-.06a1.65 1.65 0 0 1 1.82-.33 1.65 1.65 0 0 1 1 1.51V21a2 2 0 0 0 2 2 2 2 0 0 0 2-2v-.09a1.65 1.65 0 0 1 1.51-1.51z"/></svg>
            设置
          </button>
          <button class="sb-nav-item" @click="toggleDark" :title="darkMode ? '浅色模式' : '深色模式'">
            <svg v-if="darkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            {{ darkMode ? '浅色模式' : '深色模式' }}
          </button>
        </nav>
      </div>

      <div class="sidebar-bottom">
        <div v-if="!auth.isAuthenticated" class="sb-login-area">
          <p class="sb-login-hint">登录后可查看历史笔记</p>
          <button class="sb-login-btn" @click="showLogin = true">登录</button>
        </div>
        <div v-else class="sb-logout-area">
          <button class="sb-logout-btn" @click="auth.logout()">退出登录</button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <main class="main">
      <!-- Top Bar -->
      <div class="main-top" v-if="activeNav !== 'settings'">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            v-model="searchQuery"
            type="text"
            :placeholder="prefs.tr('search.placeholder')"
            class="search-input"
          />
        </div>
        <button class="new-note-btn" @click="createNote">
          {{ prefs.tr('btn.newNote') }}
        </button>
      </div>

      <!-- Content -->
      <div class="main-content">
        <!-- Settings Panel -->
        <div v-if="activeNav === 'settings'" class="settings-panel">
          <h3 class="settings-heading">{{ prefs.tr('settings.title') }}</h3>
          <div class="settings-group">
            <div class="settings-row" @click="() => {}">
              <span>{{ prefs.tr('settings.help') }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
            <div class="settings-row" @click="() => {}">
              <span>{{ prefs.tr('settings.feedback') }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
            <div class="settings-row">
              <span>{{ prefs.tr('settings.lang') }}</span>
              <select v-model="prefs.lang" class="settings-select">
                <option value="zh-CN">简体中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
              </select>
            </div>
            <div class="settings-row" @click="showShortcuts = true">
              <span>{{ prefs.tr('settings.shortcuts') }}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>
            <div class="settings-row" @click="() => {}">
              <span>{{ prefs.tr('settings.license') }}</span>
              <span class="settings-val">Apache 2.0</span>
            </div>
            <div class="settings-row">
              <span>{{ prefs.tr('settings.fontSize') }}</span>
              <div class="font-size-control">
                <button @click="prefs.fontSize = Math.max(12, prefs.fontSize - 2)">A−</button>
                <span class="font-size-val">{{ prefs.fontSize }}px</span>
                <button @click="prefs.fontSize = Math.min(24, prefs.fontSize + 2)">A+</button>
              </div>
            </div>
          </div>
          <div class="settings-group" style="margin-top:16px">
            <div class="settings-row" @click="() => {}">
              <span>{{ prefs.tr('settings.storage') }}</span>
              <span class="settings-val">3.2 MB / 100 MB</span>
            </div>
            <div class="settings-row" @click="() => {}">
              <span>{{ prefs.tr('settings.about') }}</span>
              <span class="settings-val">v0.1.0 · Vue 3 + FastAPI</span>
            </div>
          </div>
        </div>

        <!-- Not logged in -->
        <div v-else-if="!auth.isAuthenticated" class="guest-area">
          <div class="guest-watermark">
            <img :src="logoUrl" alt="" class="guest-wm-img" />
          </div>
          <div class="guest-ambient">
            <span class="ga-dot d1" />
            <span class="ga-dot d2" />
            <span class="ga-dot d3" />
            <span class="ga-arc" />
          </div>
          <h3 class="guest-title-text">{{ prefs.tr('guest.title') }}</h3>
          <p class="guest-desc-text">{{ prefs.tr('guest.desc') }}</p>
          <button class="guest-login-btn" @click="showLogin = true">{{ prefs.tr('guest.login') }}</button>
        </div>

        <!-- Logged in — empty -->
        <div v-else-if="notes.length === 0" class="empty-state">
          <div class="empty-seed" />
          <h3 class="empty-title">{{ prefs.tr('empty.title') }}</h3>
          <p class="empty-desc">{{ prefs.tr('empty.desc') }}</p>
          <button class="empty-btn" @click="createNote">{{ prefs.tr('empty.btn') }}</button>
        </div>

        <!-- Note Cards -->
        <div v-else class="notes-grid">
          <div class="notes-ambient">
            <span class="na-circle" />
            <span class="na-arc" />
          </div>
          <div
            v-for="(note, idx) in filteredNotes"
            :key="note.id"
            class="note-card"
            :class="{ pressing: pressingCardId === note.id }"
            :style="{ '--i': idx }"
            @click="goToWork(note.id, note.title)"
            @mousedown="pressingCardId = note.id"
            @mouseup="pressingCardId = null"
            @mousemove="onCardMove"
            @mouseleave="onCardLeave"
          >
            <div class="note-card-top">
              <!-- Inline rename or title -->
              <div v-if="renamingNoteId === note.id" class="rename-wrap" @click.stop>
                <input
                  v-model="renameText"
                  class="rename-input"
                  @keydown.enter="confirmRename"
                  @keydown.escape="renamingNoteId = null"
                  @blur="confirmRename"
                />
              </div>
              <h3 v-else class="note-title">
                <span v-if="note.starred" class="note-star-icon">★</span>
                {{ note.title }}
              </h3>
              <!-- P1b: Menu button -->
              <div class="note-more-wrap" @click.stop>
                <button class="note-more" @click="menuNoteId = menuNoteId === note.id ? null : note.id">···</button>
                <div v-if="menuNoteId === note.id" class="note-menu-drop">
                  <button @click="toggleStar(note.id)">
                    {{ note.starred ? '☆ 取消收藏' : '★ 收藏' }}
                  </button>
                  <button @click="startRename(note.id)">✎ 重命名</button>
                  <button class="danger" @click="deleteNote(note.id)">✕ 删除</button>
                </div>
              </div>
            </div>
            <div class="note-card-body">
              <!-- P1a: Content preview -->
              <p v-if="note.preview" class="note-preview">{{ note.preview }}</p>
              <p class="note-summary">
                共 {{ note.conversations }} 轮对话 · {{ note.docType.toUpperCase() }}
              </p>
            </div>
            <div class="note-card-foot">
              <span class="note-meta">{{ note.updatedAt }}</span>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Keyboard Shortcuts Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showShortcuts" class="modal-overlay" @click.self="showShortcuts = false">
          <div class="shortcuts-modal">
            <button class="login-close" @click="showShortcuts = false">&times;</button>
            <h3 class="shortcuts-title">键盘快捷键</h3>
            <div class="shortcuts-list">
              <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>K</kbd><span>搜索笔记</span></div>
              <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>N</kbd><span>新建笔记</span></div>
              <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>D</kbd><span>切换深色模式</span></div>
              <div class="shortcut-row"><kbd>Esc</kbd><span>关闭弹窗</span></div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.notes-app {
  display: flex;
  min-height: 100vh;
  background: var(--brand-bg-root);
  font-family: var(--brand-font-body);
}


/* ── Sidebar ── */
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: linear-gradient(180deg,
    var(--brand-bg-sidebar) 0%,
    color-mix(in srgb, var(--brand-accent) 3%, var(--brand-bg-sidebar) 97%) 100%
  );
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex-shrink: 0;
  border-right: 1px solid var(--brand-border);
}
.sidebar-top { padding: 24px 16px; }
.sb-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  margin-bottom: 32px;
}
.sb-logo-img { height: 28px; width: auto; }
.sb-logo-text {
  font-family: var(--brand-font-display);
  font-size: 17px;
  font-weight: 700;
  color: var(--brand-ink-primary);
}
.sb-user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 4px;
  margin-bottom: 28px;
}
.sb-avatar {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: var(--brand-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 600;
  flex-shrink: 0;
}
.sb-user-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.sb-user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--brand-ink-primary);
}
.sb-user-email {
  font-size: 12px;
  color: var(--brand-ink-secondary);
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.sb-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sb-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  font-family: var(--brand-font-body);
  color: var(--brand-ink-secondary);
  background: none;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background 200ms ease-out, color 200ms ease-out;
  text-align: left;
}
.sb-nav-item:hover { background: var(--brand-bg-hover); color: var(--brand-ink-primary); }
.sb-nav-item.active { background: var(--brand-bg-surface); color: var(--brand-accent); font-weight: 500; }
.sb-nav-icon { flex-shrink: 0; opacity: 0.55; transition: opacity 200ms ease-out, transform 200ms ease-out; }
.sb-icon-filled { display: none; }
.sb-nav-item.active .sb-nav-icon { opacity: 1; color: var(--brand-accent); animation: iconPop 300ms ease-out; }
.sb-nav-item.active .sb-icon-outline { display: none; }
.sb-nav-item.active .sb-icon-filled { display: inline; }
@keyframes iconPop {
  0% { transform: scale(0.6); }
  50% { transform: scale(1.15); }
  100% { transform: scale(1); }
}
.sidebar-bottom { padding: 16px; display: flex; flex-direction: column; gap: 8px; }
.sb-login-area {
  padding: 12px;
  border-radius: 8px;
  background: var(--brand-bg-hover);
  margin-bottom: 4px;
}
.sb-login-hint {
  font-size: 12px;
  color: var(--brand-ink-secondary);
  margin: 0 0 8px;
  line-height: 1.4;
}
.sb-login-btn {
  width: 100%;
  padding: 8px 0;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--brand-font-body);
  border: none;
  border-radius: 6px;
  background: var(--brand-accent);
  color: #fff;
  cursor: pointer;
  transition: background 200ms ease-out;
}
.sb-login-btn:hover { background: #7DA86F; }
.sb-logout-btn {
  width: 100%;
  padding: 8px 0;
  font-size: 13px;
  font-family: var(--brand-font-body);
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  background: none;
  color: var(--brand-ink-secondary);
  cursor: pointer;
  transition: background 200ms ease-out;
}
.sb-logout-btn:hover { background: var(--brand-bg-hover); }
/* ── Main ── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px;
  gap: 20px;
}
.search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  background: var(--brand-bg-root);
  width: 320px;
  transition: border-color 200ms ease-out, box-shadow 200ms ease-out;
}
.search-box:focus-within {
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 3px rgba(107,155,94,0.1);
}
.search-icon { opacity: 0.4; flex-shrink: 0; color: var(--brand-ink-secondary); }
.search-input {
  flex: 1;
  border: none;
  outline: none;
  background: none;
  font-size: 14px;
  font-family: var(--brand-font-body);
  color: var(--brand-ink-primary);
}
.search-input::placeholder { color: var(--brand-ink-secondary); opacity: 0.55; }
.new-note-btn {
  padding: 10px 20px;
  font-size: 14px;
  font-weight: 500;
  font-family: var(--brand-font-body);
  border: none;
  border-radius: 8px;
  background: var(--brand-accent);
  color: #fff;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background 200ms ease-out;
}
.new-note-btn:hover { background: #7DA86F; }
.new-note-btn::after {
  content: '';
  position: absolute;
  bottom: 0; left: -100%;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.7) 50%, transparent 100%);
}
.new-note-btn:hover::after {
  animation: btnShimmer 3s ease-in-out infinite;
}
@keyframes btnShimmer {
  0% { left: -100%; }
  16% { left: 100%; }
  16.01% { left: -100%; }
  100% { left: -100%; }
}

/* ── Settings ── */
.settings-panel {
  max-width: 560px;
}
.settings-heading {
  font-family: var(--brand-font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 24px;
}
.settings-group {
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  overflow: hidden;
}
.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  font-size: 15px;
  color: var(--brand-ink-primary);
  cursor: pointer;
  transition: background 200ms ease-out;
  border-bottom: 1px solid var(--brand-border);
}
.settings-row:last-child { border-bottom: none; }
.settings-row:hover { background: var(--brand-bg-hover); }
.settings-val {
  font-size: 14px;
  color: var(--brand-ink-secondary);
}
.settings-select {
  font-size: 14px;
  font-family: var(--brand-font-body);
  padding: 6px 10px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  background: var(--brand-bg-surface);
  color: var(--brand-ink-primary);
  cursor: pointer;
  outline: none;
}
.settings-select:focus { border-color: var(--brand-accent); }
.font-size-control {
  display: flex;
  align-items: center;
  gap: 10px;
}
.font-size-control button {
  width: 30px; height: 30px;
  border: 1px solid var(--brand-border);
  border-radius: 6px;
  background: var(--brand-bg-surface);
  color: var(--brand-ink-primary);
  font-size: 13px;
  cursor: pointer;
  font-family: var(--brand-font-body);
  transition: border-color 200ms ease-out;
}
.font-size-control button:hover { border-color: var(--brand-accent); }
.font-size-val {
  font-size: 13px;
  color: var(--brand-ink-secondary);
  min-width: 36px;
  text-align: center;
}
.shortcuts-modal {
  position: relative;
  width: 400px;
  padding: 36px 32px;
  background: var(--brand-bg-surface);
  border-radius: 14px;
  box-shadow: 0 0 0 1px var(--brand-border), 0 8px 40px rgba(27,29,26,0.06);
}
.shortcuts-title {
  font-family: var(--brand-font-display);
  font-size: 20px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 24px;
}
.shortcuts-list { display: flex; flex-direction: column; gap: 12px; }
.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  color: var(--brand-ink-primary);
}
.shortcut-row span { color: var(--brand-ink-secondary); }
kbd {
  padding: 3px 8px;
  font-size: 12px;
  font-family: var(--brand-font-mono);
  color: var(--brand-ink-primary);
  background: var(--brand-bg-hover);
  border: 1px solid var(--brand-border);
  border-radius: 4px;
}

/* ── Content ── */
.main-content {
  flex: 1;
  padding: 8px 32px 40px;
}

/* Guest / Not logged in */
.guest-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  text-align: center;
  position: relative;
  min-height: calc(100vh - 80px);
  overflow: hidden;
}
.guest-watermark {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}
.guest-wm-img {
  width: 320px;
  height: auto;
  opacity: 0.06;
  filter: grayscale(1);
}
.guest-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}
.ga-dot {
  position: absolute;
  border-radius: 50%;
  background: var(--brand-accent);
  opacity: 0.06;
}
.ga-dot.d1 { width: 120px; height: 120px; top: -40px; right: -30px; }
.ga-dot.d2 { width: 36px; height: 36px; bottom: 15%; left: 8%; opacity: 0.04; }
.ga-dot.d3 { width: 24px; height: 24px; top: 25%; right: 12%; opacity: 0.03; }
.ga-arc {
  position: absolute;
  bottom: 10%;
  right: 5%;
  width: 200px; height: 100px;
  border: 1.5px solid var(--brand-accent);
  border-radius: 50%;
  opacity: 0.05;
  transform: rotate(-15deg);
}
.guest-title-text {
  font-family: var(--brand-font-display);
  font-size: 36px;
  font-weight: 700;
  color: var(--brand-ink-primary);
  margin: 0 0 12px;
  position: relative;
  z-index: 1;
  letter-spacing: -0.01em;
}
.guest-desc-text {
  font-size: 16px;
  color: var(--brand-ink-secondary);
  margin: 0 0 36px;
  max-width: 420px;
  position: relative;
  z-index: 1;
  line-height: 1.6;
}
.guest-login-btn {
  padding: 12px 36px;
  font-size: 16px;
  font-weight: 500;
  font-family: var(--brand-font-body);
  border: none;
  border-radius: 8px;
  background: var(--brand-accent);
  color: #fff;
  cursor: pointer;
  position: relative;
  z-index: 1;
  transition: background 200ms ease-out, transform 200ms ease-out;
}
.guest-login-btn:hover {
  background: #7DA86F;
  transform: translateY(-1px);
}

/* Empty */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 100px 20px;
  text-align: center;
}
.empty-seed {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--brand-accent);
  opacity: 0.25;
  margin-bottom: 24px;
}
.empty-title {
  font-family: var(--brand-font-display);
  font-size: 22px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 8px;
}
.empty-desc {
  font-size: 15px;
  color: var(--brand-ink-secondary);
  margin: 0 0 32px;
}
.empty-btn {
  padding: 12px 28px;
  font-size: 15px;
  font-weight: 500;
  font-family: var(--brand-font-body);
  border: none;
  border-radius: 8px;
  background: var(--brand-accent);
  color: #fff;
  cursor: pointer;
  transition: background 200ms ease-out;
}
.empty-btn:hover { background: #7DA86F; }

/* Cards */
.notes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.notes-ambient {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.na-circle {
  position: absolute;
  width: 300px; height: 300px;
  border-radius: 50%;
  border: 1.5px solid var(--brand-accent);
  opacity: 0.03;
  top: -80px; right: -60px;
}
.na-arc {
  position: absolute;
  width: 120px; height: 60px;
  border: 1px solid var(--brand-accent);
  border-bottom: none;
  border-radius: 50% 50% 0 0;
  opacity: 0.025;
  bottom: 30px; left: -20px;
  transform: rotate(8deg);
}
/* P1c: Staggered card entrance */
.note-card {
  padding: 20px;
  border: 1px solid var(--brand-border);
  border-radius: 10px;
  background: var(--brand-bg-surface);
  cursor: pointer;
  transform: perspective(800px) rotateX(calc(var(--tilt-x, 0) * 1deg)) rotateY(calc(var(--tilt-y, 0) * 1deg));
  transition: box-shadow 300ms ease-out,
              border-color 300ms ease-out,
              transform 120ms ease-out;
  position: relative;
  z-index: 1;
  opacity: 0;
  animation: cardEnter 400ms ease-out forwards;
  animation-delay: calc(var(--i, 0) * 55ms + 80ms);
}
@keyframes cardEnter {
  0%   { opacity: 0; clip-path: inset(0 0 100% 0); }
  100% { opacity: 1; clip-path: inset(0 0 0 0); }
}
@media (prefers-reduced-motion: reduce) {
  .note-card { opacity: 1; animation: none; }
}
/* P0: Pressed state — uses filter to avoid clashing with tilt transform */
.note-card.pressing {
  filter: brightness(0.94);
  transition: filter 80ms ease-in;
}
.note-card:hover {
  box-shadow: 0 12px 40px rgba(27,29,26,0.08);
  border-color: var(--brand-accent);
}
.note-card-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.note-title {
  font-family: var(--brand-font-display);
  font-size: 18px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0;
  line-height: 1.3;
  display: flex; align-items: center; gap: 6px;
}
.note-star-icon { color: #D4A84A; font-size: 14px; flex-shrink: 0; }

/* P1b: Menu */
.note-more-wrap { position: relative; flex-shrink: 0; }
.note-more {
  background: none;
  border: none;
  font-size: 16px;
  color: var(--brand-ink-secondary);
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  opacity: 0;
  transition: opacity 200ms ease-out, background 200ms ease-out;
}
.note-card:hover .note-more { opacity: 1; }
.note-more:hover { background: var(--brand-bg-hover); }
.note-menu-drop {
  position: absolute; top: 100%; right: 0;
  min-width: 140px;
  background: var(--brand-bg-surface);
  border: 1px solid var(--brand-border);
  border-radius: 8px; padding: 4px;
  z-index: 20;
  box-shadow: 0 6px 24px rgba(27,29,26,0.1);
  animation: cardEnter 150ms ease-out;
}
.note-menu-drop button {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 8px 12px;
  font-size: 13px; font-family: var(--brand-font-body);
  background: none; border: none; border-radius: 5px;
  color: var(--brand-ink-primary); cursor: pointer;
  transition: background .1s;
  text-align: left;
}
.note-menu-drop button:hover { background: var(--brand-bg-hover); }
.note-menu-drop button.danger { color: var(--brand-danger); }

/* Rename */
.rename-wrap { flex: 1; margin-right: 8px; }
.rename-input {
  width: 100%;
  font-family: var(--brand-font-display);
  font-size: 18px; font-weight: 600;
  color: var(--brand-ink-primary);
  background: var(--brand-bg-root);
  border: 1px solid var(--brand-accent);
  border-radius: 6px; padding: 4px 8px;
  outline: none;
  box-shadow: 0 0 0 2px rgba(107,155,94,0.1);
}

.note-card-body { margin-bottom: 14px; }
/* P1a: Content preview */
.note-preview {
  font-size: 13px; color: var(--brand-ink-primary);
  margin: 0 0 6px;
  line-height: 1.55;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
.note-summary {
  font-size: 12px;
  color: var(--brand-ink-secondary);
  margin: 0;
  line-height: 1.4;
}
.note-card-foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.note-meta {
  font-size: 12px;
  color: var(--brand-ink-secondary);
  opacity: 0.7;
}

@media (prefers-reduced-motion: reduce) {
  .note-card { transition: none; }
  .new-note-btn::after { display: none; }
}
</style>
