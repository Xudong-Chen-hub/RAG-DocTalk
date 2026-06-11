<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useTransitionStore } from '@/stores/transition'
import Button from '@/components/ui/button/Button.vue'
import logoUrl from '@/assets/logo.svg'

const router = useRouter()
const transitionStore = useTransitionStore()
const navScrolled = ref(false)
const visibleSections = ref<Set<number>>(new Set())
const rainCanvas = ref<HTMLCanvasElement | null>(null)

function onScroll() {
  navScrolled.value = window.scrollY > 64
}

let observer: IntersectionObserver | null = null

// ── Rain Physics Engine ──
interface Drop { x: number; y: number; speed: number; len: number; opacity: number }
interface Splash { x: number; y: number; vx: number; vy: number; life: number; size: number }
interface Ripple { x: number; y: number; radius: number; life: number; maxR: number }

let drops: Drop[] = []
let splashes: Splash[] = []
let ripples: Ripple[] = []
let waterLevel = 0
let rainRAF = 0
let splashZones: { top: number; bottom: number; left: number; right: number }[] = []

function scanSplashZones() {
  splashZones = []
  const selectors = ['.hero-title', '.hero-eng', '.hero-subtitle', '.hero-cta',
    '.feature-title', '.feature-desc', '.geo-placeholder']
  selectors.forEach(sel => {
    document.querySelectorAll(sel).forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) {
        splashZones.push({ top: r.top, bottom: r.bottom, left: r.left, right: r.right })
      }
    })
  })
}

function spawnDrop(w: number) {
  return {
    x: Math.random() * w,
    y: -10 - Math.random() * 300,
    speed: 1.2 + Math.random() * 2.8,
    len: 6 + Math.random() * 10,
    opacity: 0.3 + Math.random() * 0.3,
  }
}

function spawnSplash(x: number, y: number) {
  const count = 3 + Math.floor(Math.random() * 4)
  for (let i = 0; i < count; i++) {
    const angle = -Math.PI * (0.15 + Math.random() * 0.55)
    const speed = 1 + Math.random() * 2.5
    splashes.push({
      x, y,
      vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
      vy: Math.sin(angle) * speed - Math.random() * 1.2,
      life: 1,
      size: 1.2 + Math.random() * 2,
    })
  }
}

function rainLoop(ctx: CanvasRenderingContext2D, w: number, h: number) {
  if (drops.length < 200) {
    for (let i = 0; i < 2; i++) drops.push(spawnDrop(w))
  }

  ctx.clearRect(0, 0, w, h)

  const isGlowing = transitionStore.phase === 'expanding'
  const glowR = isGlowing ? 130 : 165
  const glowG = isGlowing ? 185 : 195
  const glowB = isGlowing ? 110 : 155

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]
    d.y += d.speed
    ctx.strokeStyle = `rgba(${glowR},${glowG},${glowB},${d.opacity})`
    ctx.lineWidth = isGlowing ? 1.4 : 1.0
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(d.x, d.y)
    ctx.lineTo(d.x - d.speed * 0.25, d.y + d.len)
    ctx.stroke()

    let hit = false
    for (const z of splashZones) {
      if (d.x > z.left && d.x < z.right && d.y + d.len > z.top && d.y < z.bottom) {
        hit = true
        break
      }
    }
    if (hit) {
      spawnSplash(d.x, d.y + d.len)
      drops.splice(i, 1)
      continue
    }

    // Hit water surface or page bottom
    const docHeight = document.body.scrollHeight
    const waterY = docHeight - window.scrollY
    const nearBottom = waterY < h + 60 && waterY > 0
    const surfaceY = nearBottom ? (waterY - waterLevel * 0.6) : Math.max(h, docHeight)

    if (d.y + d.len > surfaceY) {
      if (nearBottom) {
        waterLevel = Math.min(waterLevel + 0.08, 60)
        if (waterLevel > 1.5) {
          ripples.push({
            x: d.x, y: surfaceY,
            radius: 0, life: 1, maxR: 8 + Math.random() * 16,
          })
        }
      }
      drops.splice(i, 1)
      continue
    }
  }

  for (let i = splashes.length - 1; i >= 0; i--) {
    const s = splashes[i]
    s.x += s.vx
    s.y += s.vy
    s.vy += 0.08
    s.life -= 0.028
    if (s.life <= 0) { splashes.splice(i, 1); continue }
    ctx.fillStyle = `rgba(${glowR + 30},${glowG},${glowB},${s.life * 0.55})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2)
    ctx.fill()
  }

  // Draw & update ripples on water surface
  const docH = document.body.scrollHeight
  const waterY = docH - window.scrollY
  const showWater = waterY < h + 80 && waterY > 0
  const waterTop = waterY - waterLevel * 0.6

  if (showWater && waterLevel > 1) {
    // Water body — fills from surface down to bottom of canvas
    const waterBottom = h + 40
    const waterHeight = waterBottom - waterTop
    const grad = ctx.createLinearGradient(0, waterTop, 0, waterBottom)
    grad.addColorStop(0, 'rgba(130,175,135,0.08)')
    grad.addColorStop(0.15, 'rgba(120,165,128,0.16)')
    grad.addColorStop(0.5, 'rgba(105,150,115,0.28)')
    grad.addColorStop(1, 'rgba(85,135,100,0.4)')
    ctx.fillStyle = grad
    ctx.fillRect(0, waterTop, w, waterHeight)

    // Surface reflection line
    ctx.strokeStyle = `rgba(180,215,185,${Math.min(waterLevel / 30, 0.5)})`
    ctx.lineWidth = 1.5
    ctx.beginPath()
    for (let x = 0; x < w; x += 6) {
      const wave = Math.sin(x * 0.03 + performance.now() * 0.002) * 2
      if (x === 0) ctx.moveTo(x, waterTop + wave)
      else ctx.lineTo(x, waterTop + wave)
    }
    ctx.stroke()
  }

  // Update & draw ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]
    r.radius += 1.2
    r.life -= 0.035
    if (r.life <= 0) { ripples.splice(i, 1); continue }
    if (showWater) {
      ctx.strokeStyle = `rgba(180,210,185,${r.life * 0.5})`
      ctx.lineWidth = 1.2 * r.life
      ctx.beginPath()
      ctx.arc(r.x, waterTop, r.radius, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // Slow evaporation
  waterLevel = Math.max(0, waterLevel - 0.008)

  rainRAF = requestAnimationFrame(() => rainLoop(ctx, w, h))
}

function startRain() {
  const canvas = rainCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const resize = () => {
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight
  }
  resize()
  scanSplashZones()
  window.addEventListener('resize', resize)
  window.addEventListener('scroll', scanSplashZones)
  rainRAF = requestAnimationFrame(() => rainLoop(ctx, canvas.width, canvas.height))
}

function stopRain() {
  cancelAnimationFrame(rainRAF)
  drops = []
  splashes = []
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const idx = Number((entry.target as HTMLElement).dataset.section)
        if (entry.isIntersecting) {
          visibleSections.value = new Set([...visibleSections.value, idx])
        }
      })
    },
    { threshold: 0.25 }
  )

  document.querySelectorAll('[data-section]').forEach((el) => observer!.observe(el))

  startRain()
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  observer?.disconnect()
  stopRain()
})

function goToNotes() {
  transitionStore.startGlow(() => router.push('/notes'))
}

// Watch for glow — rain intensifies briefly then page unmounts naturally
watch(() => transitionStore.phase, (p) => {
  if (p === 'expanding') {
    // Rain accelerates and turns greener as the glow expands
    drops.forEach(d => { d.speed *= 1.6; d.opacity = Math.min(0.7, d.opacity + 0.2) })
  }
})
</script>

<template>
  <div class="landing">
    <canvas ref="rainCanvas" class="rain-canvas" />
    <!-- Nav -->
    <nav class="nav" :class="{ scrolled: navScrolled }">
      <a href="/" class="nav-logo">
        <img :src="logoUrl" alt="RAG-DocTalk" class="logo-img" />
        <span class="logo-text">RAG-DocTalk</span>
      </a>
      <div class="nav-links">
        <a href="#features" class="nav-link">功能</a>
      </div>
    </nav>

    <!-- Hero -->
    <section class="hero">
      <div class="hero-glow" />
      <h1 class="hero-title">让文档开口说话</h1>
      <p class="hero-eng">Let your documents speak.</p>
      <p class="hero-subtitle">
        上传你的文档，用自然语言提问，获得有据可查的回答。
      </p>
      <Button class="hero-cta" size="lg" @click="goToNotes">
        使用RAG-DocTalk
      </Button>
    </section>

    <!-- Feature 1 -->
    <section
      id="features"
      class="feature"
      data-section="1"
      :class="{ visible: visibleSections.has(1) }"
    >
      <div class="feature-inner">
        <div class="feature-text">
          <span class="feature-label">来源</span>
          <h2 class="feature-title">把文档变成对话</h2>
          <p class="feature-desc">
            上传 PDF、Word 或纯文本。系统自动分块、理解内容，然后你就可以像和人聊天一样，向你的文档提问。
          </p>
        </div>
        <div class="feature-visual">
          <div class="geo-placeholder geo-doc-chat">
            <div class="geo-doc">
              <div class="geo-doc-line" />
              <div class="geo-doc-line short" />
              <div class="geo-doc-line" />
              <div class="geo-doc-line short" />
            </div>
            <div class="geo-arrow">
              <span class="geo-dot" />
              <span class="geo-dot" />
              <span class="geo-dot" />
            </div>
            <div class="geo-bubble">
              <div class="geo-chat-scroll">
                <div class="geo-chat-batch">
                  <div class="geo-msg left short" />
                  <div class="geo-msg left" />
                  <div class="geo-msg right short" />
                  <div class="geo-msg left" />
                  <div class="geo-msg left mid" />
                  <div class="geo-msg right" />
                  <div class="geo-msg left short" />
                  <div class="geo-msg left mid" />
                  <div class="geo-msg right short" />
                  <div class="geo-msg left" />
                </div>
                <div class="geo-chat-batch" aria-hidden="true">
                  <div class="geo-msg left short" />
                  <div class="geo-msg left" />
                  <div class="geo-msg right short" />
                  <div class="geo-msg left" />
                  <div class="geo-msg left mid" />
                  <div class="geo-msg right" />
                  <div class="geo-msg left short" />
                  <div class="geo-msg left mid" />
                  <div class="geo-msg right short" />
                  <div class="geo-msg left" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 2 -->
    <section
      class="feature alt"
      data-section="2"
      :class="{ visible: visibleSections.has(2) }"
    >
      <div class="feature-inner">
        <div class="feature-text">
          <span class="feature-label">引用</span>
          <h2 class="feature-title">每个回答都有据可查</h2>
          <p class="feature-desc">
            不是凭空生成。每一条回答都标注了原文出处，点击引用即可看到原始段落。你知道答案从哪里来。
          </p>
        </div>
        <div class="feature-visual">
          <div class="geo-placeholder geo-citation">
            <div class="geo-pages">
              <div class="geo-page p4">
                <div class="geo-page-line" />
                <div class="geo-page-line" />
                <div class="geo-page-line" />
              </div>
              <div class="geo-page p3">
                <div class="geo-page-line" />
                <div class="geo-page-line highlight" />
                <div class="geo-page-line" />
              </div>
              <div class="geo-page p2">
                <div class="geo-page-line" />
                <div class="geo-page-line" />
                <div class="geo-page-line" />
              </div>
              <div class="geo-page p1">
                <div class="geo-page-line" />
                <div class="geo-page-line highlight" />
                <div class="geo-page-line" />
              </div>
            </div>
            <div class="geo-cite-arc" />
            <div class="geo-cite-chip">
              <span>[1]</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Feature 3 -->
    <section
      class="feature"
      data-section="3"
      :class="{ visible: visibleSections.has(3) }"
    >
      <div class="feature-inner">
        <div class="feature-text">
          <span class="feature-label">生成</span>
          <h2 class="feature-title">不止于问答</h2>
          <p class="feature-desc">
            把文档内容转为双人播客音频、思维导图、PPT。你需要的时候，一键生成。不需要的时候，它安静地等着。
          </p>
        </div>
        <div class="feature-visual">
          <div class="geo-placeholder geo-radial">
            <div class="geo-center" />
            <div class="geo-ring" />
            <div class="geo-node" style="--x: -1; --y: -1">
              <div class="geo-node-icon tree">
                <span class="tree-root" />
                <span class="tree-branch t-b1" />
                <span class="tree-branch t-b2" />
                <span class="tree-branch t-b3" />
                <span class="tree-leaf t-l1" />
                <span class="tree-leaf t-l2" />
                <span class="tree-leaf t-l3" />
                <span class="tree-leaf t-l4" />
                <span class="tree-leaf t-l5" />
              </div>
            </div>
            <div class="geo-node" style="--x: 1; --y: -1">
              <div class="geo-node-icon bars">
                <span class="bar-1" />
                <span class="bar-2" />
                <span class="bar-3" />
                <span class="bar-4" />
              </div>
            </div>
            <div class="geo-node" style="--x: -1; --y: 1">
              <div class="geo-node-icon video">
                <span class="video-frame" />
                <span class="video-play" />
              </div>
            </div>
            <div class="geo-node" style="--x: 1; --y: 1">
              <div class="geo-node-icon table">
                <span class="table-sheet s3" />
                <span class="table-sheet s2" />
                <span class="table-sheet s1" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <div class="footer-inner">
        <span>RAG-DocTalk &copy; 2026</span>
        <a href="https://github.com/Xudong-Chen-hub/RAG-DocTalk" target="_blank" rel="noopener">GitHub</a>
      </div>
    </footer>
  </div>
</template>

<style scoped>
/* ── Base ── */
.landing {
  min-height: 100vh;
  background: var(--brand-bg-root);
  overflow-x: hidden;
  position: relative;
}
.rain-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 100;
  pointer-events: none;
}

/* ── Nav ── */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 50;
  height: 56px;
  padding: 0 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: transparent;
  transition: background 300ms ease-out, backdrop-filter 300ms ease-out;
}
.nav.scrolled {
  background: rgba(250, 251, 248, 0.82);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}
.nav-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
}
.logo-img {
  height: 44px;
  width: auto;
  flex-shrink: 0;
}
.logo-text {
  font-family: var(--brand-font-display);
  font-size: 22px;
  font-weight: 700;
  color: var(--brand-ink-primary);
  letter-spacing: 0.03em;
}
.nav-links {
  display: flex;
  gap: 36px;
}
.nav-link {
  font-size: 15px;
  font-weight: 500;
  color: var(--brand-accent);
  text-decoration: none;
  transition: color 200ms ease-out;
}
.nav-link:hover {
  color: #7DA86F;
}

/* ── Hero ── */
.hero {
  padding: 140px 24px 100px;
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
  position: relative;
}
.hero-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 1300px;
  height: 700px;
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(124, 174, 110, 0.26) 0%,
    rgba(107, 155, 94, 0.14) 38%,
    rgba(107, 155, 94, 0.06) 50%,
    transparent 60%
  );
  pointer-events: none;
  z-index: 0;
  filter: blur(50px);
}
.hero-title,
.hero-eng,
.hero-subtitle,
.hero-cta {
  position: relative;
  z-index: 1;
}
.hero-title {
  font-family: var(--brand-font-display);
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 700;
  color: var(--brand-ink-primary);
  letter-spacing: -0.02em;
  text-wrap: balance;
  margin: 0;
  line-height: 1.08;
}
.hero-eng {
  font-family: 'Geist', 'Noto Sans SC', sans-serif;
  font-size: 18px;
  font-weight: 400;
  color: var(--brand-ink-secondary);
  margin: 20px 0 0;
  letter-spacing: 0.04em;
  font-style: italic;
  line-height: 1.4;
}
.hero-subtitle {
  font-size: 18px;
  color: var(--brand-ink-secondary);
  max-width: 480px;
  margin: 14px auto 0;
  text-wrap: pretty;
  line-height: 1.75;
}
.hero-cta {
  margin-top: 40px;
  padding: 16px 44px;
  font-size: 17px;
  font-weight: 500;
  border-radius: 8px;
  background: var(--brand-accent) !important;
  color: #fff !important;
  border: none;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: background 200ms ease-out, transform 200ms ease-out;
}
.hero-cta::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -100%;
  width: 100%;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.7) 50%,
    transparent 100%
  );
  transition: none;
}
.hero-cta:hover {
  background: #7DA86F !important;
  transform: translateY(-1px);
}
.hero-cta:hover::after {
  animation: buttonShimmer 3s ease-in-out infinite;
}
@keyframes buttonShimmer {
  0%   { left: -100%; }
  26%  { left: 100%; }
  26.01% { left: -100%; }
  100% { left: -100%; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-cta::after { display: none; }
}

/* ── Feature Sections ── */
.feature {
  padding: 100px 48px;
  transition: opacity 700ms ease-out, transform 700ms ease-out;
  opacity: 0;
  transform: translateY(30px);
}
.feature.visible {
  opacity: 1;
  transform: translateY(0);
}
.feature.alt {
  background: var(--brand-bg-surface);
}
@media (prefers-reduced-motion: reduce) {
  .feature { opacity: 1; transform: none; }
}
.feature-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 100px;
}
.feature.alt .feature-inner {
  flex-direction: row-reverse;
}
.feature-text {
  flex: 1;
  max-width: 440px;
}
.feature-label {
  display: inline-block;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--brand-accent);
  text-transform: uppercase;
  margin-bottom: 12px;
  font-family: var(--brand-font-body);
}
.feature-title {
  font-family: var(--brand-font-display);
  font-size: 30px;
  font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 16px;
  line-height: 1.25;
}
.feature-desc {
  font-size: 16px;
  color: var(--brand-ink-secondary);
  line-height: 1.75;
  margin: 0;
}
.feature-visual {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* ── CSS Geometric Placeholders ── */
.geo-placeholder {
  width: 360px;
  height: 240px;
  position: relative;
  transition: transform 400ms ease-out-quart;
}
.feature.visible .geo-placeholder:hover {
  transform: scale(1.03);
}

/* Placeholder 1 — Document → Chat */
.geo-doc-chat {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
}
.geo-doc {
  width: 150px;
  height: 190px;
  border: 1.5px solid var(--brand-border);
  border-radius: 8px;
  padding: 22px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--brand-bg-surface);
  transition: border-color 400ms ease-out, box-shadow 400ms ease-out;
}
.geo-placeholder:hover .geo-doc {
  border-color: var(--brand-accent);
  box-shadow: 0 0 0 6px var(--brand-cite-highlight);
}
.geo-doc-line {
  height: 3px;
  border-radius: 1.5px;
  background: var(--brand-accent);
  width: 100%;
  opacity: 0.6;
}
.geo-doc-line.short { width: 55%; }
.geo-arrow {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
}
.geo-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-accent);
  animation: dotPulse 1.2s ease-in-out infinite;
}
.geo-dot:nth-child(2) { animation-delay: 0.3s; }
.geo-dot:nth-child(3) { animation-delay: 0.6s; }
@keyframes dotPulse {
  0%, 100% { opacity: 0.25; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
@media (prefers-reduced-motion: reduce) {
  .geo-dot { animation: none; opacity: 0.6; }
}
.geo-bubble {
  width: 130px;
  height: 160px;
  border: 1.5px solid var(--brand-border);
  border-radius: 10px;
  background: var(--brand-bg-surface);
  overflow: hidden;
  transition: border-color 400ms ease-out;
}
.geo-placeholder:hover .geo-bubble {
  border-color: var(--brand-accent);
}
.geo-chat-scroll {
  display: flex;
  flex-direction: column;
  padding: 12px 10px;
  transition: transform 0.3s ease-out;
}
.geo-chat-batch {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.geo-placeholder:hover .geo-chat-scroll {
  animation: chatScroll 8s linear infinite;
}
@keyframes chatScroll {
  0%   { transform: translateY(0); }
  100% { transform: translateY(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .geo-placeholder:hover .geo-chat-scroll { animation: none; }
}
.geo-msg {
  height: 4px;
  border-radius: 2px;
  background: var(--brand-ink-secondary);
  opacity: 0.38;
}
.geo-msg.left {
  margin-right: auto;
}
.geo-msg.right {
  margin-left: auto;
  opacity: 0.25;
}
.geo-msg.short { width: 40%; }
.geo-msg.mid   { width: 58%; }
.geo-msg:not(.short):not(.mid) { width: 72%; }

/* Placeholder 2 — Citation trace */
.geo-citation {
  display: flex;
  align-items: center;
  justify-content: center;
}
.geo-pages {
  position: relative;
  width: 130px;
  height: 165px;
}
.geo-page {
  position: absolute;
  inset: 0;
  width: 130px;
  height: 165px;
  border: 1.5px solid var(--brand-border);
  border-radius: 8px;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--brand-bg-surface);
  transition: transform 0.45s cubic-bezier(0.25, 0.8, 0.25, 1),
              box-shadow 0.45s cubic-bezier(0.25, 0.8, 0.25, 1),
              border-color 0.45s cubic-bezier(0.25, 0.8, 0.25, 1),
              opacity 0.45s cubic-bezier(0.25, 0.8, 0.25, 1);
  box-sizing: border-box;
}
.geo-page.p4 { z-index: 1; }
.geo-page.p3 { z-index: 2; }
.geo-page.p2 { z-index: 3; }
.geo-page.p1 { z-index: 4; }
.geo-page.p4 { transform: translate(10px, 12px) rotate(-6deg); opacity: 0.55; box-shadow: 0 1px 3px rgba(27,29,26,0.06); }
.geo-page.p3 { transform: translate(5px, 6px) rotate(-3deg); opacity: 0.72; box-shadow: 0 1px 3px rgba(27,29,26,0.05); }
.geo-page.p2 { transform: translate(2px, 2px) rotate(-1deg); opacity: 0.88; }
.geo-page.p1 { transform: translate(0, 0) rotate(0deg); }

.geo-placeholder:hover .geo-page.p4 { transform: translate(28px, 36px) rotate(-14deg); opacity: 0.38; box-shadow: 0 4px 16px rgba(27,29,26,0.08); }
.geo-placeholder:hover .geo-page.p3 { transform: translate(16px, 18px) rotate(-8deg); opacity: 0.58; }
.geo-placeholder:hover .geo-page.p2 { transform: translate(7px, 7px) rotate(-3deg); opacity: 0.78; }
.geo-placeholder:hover .geo-page.p1 { transform: translate(0, 0) rotate(0deg); border-color: var(--brand-accent); }

.geo-page-line {
  height: 3px;
  border-radius: 1.5px;
  background: var(--brand-ink-secondary);
  width: 100%;
  opacity: 0.4;
}
.geo-page-line.highlight {
  background: var(--brand-accent);
  opacity: 1;
  box-shadow: 0 0 0 5px var(--brand-cite-highlight);
  width: 75%;
}
.geo-cite-arc {
  width: 70px;
  height: 70px;
  border: 2px solid var(--brand-accent);
  border-left: none;
  border-bottom: none;
  border-radius: 0 60% 0 0;
  margin: 0 -10px;
}
.geo-cite-chip {
  border: 1.5px solid var(--brand-accent);
  border-radius: 5px;
  padding: 7px 12px;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-accent);
  font-family: var(--brand-font-display);
  background: var(--brand-bg-surface);
  transition: background 300ms ease-out, color 300ms ease-out;
}
.geo-placeholder:hover .geo-cite-chip {
  background: var(--brand-accent);
  color: #fff;
}

/* Placeholder 3 — Radial */
.geo-radial {
  display: flex;
  align-items: center;
  justify-content: center;
}
.geo-center {
  width: 54px;
  height: 54px;
  background: var(--brand-bg-hover);
  border: 1.5px solid var(--brand-border);
  border-radius: 10px;
  position: absolute;
  z-index: 2;
  transition: transform 500ms ease-out-quart, border-color 400ms ease-out;
}
.geo-placeholder:hover .geo-center {
  transform: scale(1.12);
  border-color: var(--brand-accent);
}
.geo-ring {
  width: 110px;
  height: 110px;
  border: 1px dashed var(--brand-border);
  border-radius: 50%;
  position: absolute;
  opacity: 0;
  transition: opacity 400ms ease-out, transform 400ms ease-out;
}
.geo-placeholder:hover .geo-ring {
  opacity: 1;
  transform: scale(1.25);
}
.geo-node {
  position: absolute;
  width: 56px;
  height: 56px;
  border: 1.5px solid var(--brand-border);
  border-radius: 9px;
  background: var(--brand-bg-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(
    calc(var(--x) * 100px),
    calc(var(--y) * 72px)
  );
  transition: border-color 400ms ease-out, box-shadow 400ms ease-out, transform 400ms ease-out-quart;
}
.feature.visible .geo-node {
  transition: border-color 400ms ease-out, box-shadow 400ms ease-out, transform 400ms ease-out-quart;
}
.geo-placeholder:hover .geo-node {
  border-color: var(--brand-accent);
  box-shadow: 0 4px 16px rgba(107, 155, 94, 0.1);
}

/* ── Mindmap icon (tree) — miniature topology ── */
.geo-node-icon.tree {
  position: relative;
  width: 36px; height: 36px;
}
.tree-root {
  position: absolute;
  bottom: 2px; left: 50%;
  transform: translateX(-50%);
  width: 6px; height: 8px;
  background: var(--brand-accent);
  border-radius: 1.5px;
  z-index: 5;
}
.tree-leaf {
  position: absolute;
  width: 5px; height: 5px;
  background: var(--brand-accent);
  border-radius: 1px;
  opacity: 0.65;
  transition: opacity 0.3s ease-out, transform 0.4s cubic-bezier(0.25,0.8,0.25,1);
}
.t-l1 { top: 2px; left: 2px; }
.t-l2 { top: 2px; left: 15px; }
.t-l3 { top: 2px; right: 2px; }
.t-l4 { top: 15px; left: 8px; }
.t-l5 { top: 15px; right: 8px; }
.tree-branch {
  position: absolute;
  background: var(--brand-accent);
  opacity: 0.45;
  border-radius: 1px;
  transition: opacity 0.3s ease-out, transform 0.4s cubic-bezier(0.25,0.8,0.25,1);
}
.t-b1 {
  bottom: 10px; left: 50%;
  width: 1.8px; height: 14px;
  transform: translateX(-50%);
}
.t-b2 {
  top: 12px; left: 18px;
  width: 12px; height: 1.8px;
  transform: rotate(-15deg);
  transform-origin: left center;
}
.t-b3 {
  top: 12px; right: 18px;
  width: 12px; height: 1.8px;
  transform: rotate(15deg);
  transform-origin: right center;
}
/* Hover: collapse then regrow — ends with complete tree visible */
.geo-node:hover .tree-root {
  animation: treeGrow 1.6s ease-in-out forwards;
}
.geo-node:hover .tree-branch {
  animation: branchLifecycle 1.6s ease-in-out forwards;
}
.geo-node:hover .tree-leaf {
  animation: leafLifecycle 1.6s ease-in-out forwards;
}
@keyframes treeGrow {
  0%   { height: 8px; }
  25%  { height: 20px; }
  50%  { height: 20px; }
  75%  { height: 8px; }
  100% { height: 8px; }
}
@keyframes branchLifecycle {
  0%   { opacity: 0.45; }
  30%  { opacity: 0; }
  55%  { opacity: 0; }
  85%  { opacity: 0.45; }
  100% { opacity: 0.45; }
}
@keyframes leafLifecycle {
  0%   { opacity: 0.65; }
  35%  { opacity: 0; }
  60%  { opacity: 0; }
  85%  { opacity: 0.65; }
  100% { opacity: 0.65; }
}
@media (prefers-reduced-motion: reduce) {
  .geo-node:hover .tree-root,
  .geo-node:hover .tree-branch,
  .geo-node:hover .tree-leaf { animation: none; }
}

/* ── Audio icon (bars) — staggered jitter spectrum ── */
.geo-node-icon.bars {
  display: flex;
  gap: 3px;
  align-items: flex-end;
  height: 22px;
}
.geo-node-icon.bars span {
  display: block;
  width: 5px;
  border-radius: 2px;
  background: var(--brand-accent);
  transition: height 0.3s ease-out;
}
.bar-1 { height: 10px; }
.bar-2 { height: 18px; }
.bar-3 { height: 14px; }
.bar-4 { height: 22px; }
.geo-node:hover .bar-1 { animation: barJitter 0.45s ease-in-out infinite; }
.geo-node:hover .bar-2 { animation: barJitter 0.52s ease-in-out infinite 0.08s; }
.geo-node:hover .bar-3 { animation: barJitter 0.48s ease-in-out infinite 0.16s; }
.geo-node:hover .bar-4 { animation: barJitter 0.55s ease-in-out infinite 0.24s; }
@keyframes barJitter {
  0%, 100% { transform: scaleY(1); }
  25% { transform: scaleY(1.45); }
  50% { transform: scaleY(0.65); }
  75% { transform: scaleY(1.3); }
}
@media (prefers-reduced-motion: reduce) {
  .geo-node:hover [class*="bar-"] { animation: none; }
}

/* ── Video icon — rect + triangle, spin 360deg on hover ── */
.geo-node-icon.video {
  position: relative;
  width: 28px; height: 20px;
}
.video-frame {
  display: block;
  width: 100%; height: 100%;
  border: 2px solid var(--brand-accent);
  border-radius: 3px;
}
.video-play {
  display: block;
  position: absolute;
  inset: 50%;
  width: 0; height: 0;
  border-left: 9px solid var(--brand-accent);
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  transform: translate(-50%, -50%) translateX(1px);
  transition: transform 0.6s cubic-bezier(0.25,0.8,0.25,1);
}
.geo-node:hover .video-play {
  transform: translate(-50%, -50%) translateX(1px) rotate(360deg);
}
@media (prefers-reduced-motion: reduce) {
  .geo-node:hover .video-play { transform: translate(-50%, -50%) translateX(1px); }
}

/* ── Table icon — 3 layered sheets, top slides away on hover ── */
.geo-node-icon.table {
  position: relative;
  width: 26px; height: 22px;
}
.table-sheet {
  position: absolute;
  border: 1.5px solid var(--brand-accent);
  border-radius: 2px;
  background: var(--brand-bg-surface);
  box-sizing: border-box;
  transition: transform 0.8s cubic-bezier(0.25,0.8,0.25,1),
              opacity 0.8s cubic-bezier(0.25,0.8,0.25,1),
              box-shadow 0.8s cubic-bezier(0.25,0.8,0.25,1);
}
.table-sheet.s3 {
  z-index: 1; inset: 0;
  width: 26px; height: 22px;
  transform: translate(3px, 4px);
  opacity: 0.4;
  box-shadow: 0 1px 3px rgba(27,29,26,0.07);
}
.table-sheet.s2 {
  z-index: 2; inset: 0;
  width: 26px; height: 22px;
  transform: translate(0px, 1px);
  opacity: 0.6;
  box-shadow: 0 1px 3px rgba(27,29,26,0.05);
}
.table-sheet.s1 {
  z-index: 3; inset: 0;
  width: 26px; height: 22px;
  transform: translate(-2px, -2px);
}
/* internal grid lines */
.table-sheet::after {
  content: '';
  position: absolute;
  left: 3px; right: 3px;
  height: 2px;
  background: var(--brand-accent);
  opacity: 0.3;
  border-radius: 1px;
}
.table-sheet::before {
  content: '';
  position: absolute;
  left: 3px; right: 3px;
  height: 2px;
  background: var(--brand-accent);
  opacity: 0.18;
  border-radius: 1px;
}
/* s1: header + 3 rows + vertical column divider */
.table-sheet.s1::after { top: 5px; opacity: 0.4; height: 3px; }
.table-sheet.s1::before { top: 11px; }
/* s2: header + 2 rows */
.table-sheet.s2::after { top: 6px; opacity: 0.35; }
.table-sheet.s2::before { top: 13px; opacity: 0.15; }
/* s3: header + 4 dense rows */
.table-sheet.s3::after { top: 4px; }
.table-sheet.s3::before { top: 8px; }

/* hover: top → bottom, others step up (cycle rotation) */
.geo-node:hover .table-sheet.s3 {
  z-index: 2;
  transform: translate(2px, 3px);
  opacity: 0.6;
}
.geo-node:hover .table-sheet.s2 {
  z-index: 3;
  transform: translate(0, 0);
  opacity: 1;
  box-shadow: none;
}
.geo-node:hover .table-sheet.s1 {
  z-index: 1;
  transform: translate(5px, 6px);
  opacity: 0.4;
  box-shadow: 0 1px 3px rgba(27,29,26,0.07);
}

/* ── Footer ── */
.footer {
  padding: 48px;
  background: var(--brand-bg-surface);
}
.footer-inner {
  max-width: 1000px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #8B9288;
}
.footer-inner a {
  color: #8B9288;
  text-decoration: none;
  transition: color 200ms ease-out;
}
.footer-inner a:hover {
  color: var(--brand-ink-primary);
}

/* ── Responsive ── */
@media (max-width: 900px) {
  .nav { padding: 0 24px; }
  .feature { padding: 72px 24px; }
  .feature-inner,
  .feature.alt .feature-inner {
    flex-direction: column;
    gap: 48px;
  }
  .feature-text { max-width: 100%; }
  .geo-placeholder {
    width: 300px;
    height: 200px;
  }
  .geo-node {
    transform: translate(
      calc(var(--x) * 72px),
      calc(var(--y) * 52px)
    );
  }
}

@media (max-width: 480px) {
  .hero { padding: 100px 20px 80px; }
  .hero-title { font-size: 2rem; }
  .hero-subtitle { font-size: 16px; }
  .nav { padding: 0 16px; }
  .logo-text { font-size: 18px; }
  .logo-img { height: 36px; }
}
</style>
