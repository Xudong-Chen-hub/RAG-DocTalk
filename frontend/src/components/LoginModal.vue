<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { usePrefsStore } from '@/stores/prefs'

const emit = defineEmits<{ close: [] }>()
const auth = useAuthStore()
const prefs = usePrefsStore()

const email = ref('')
const password = ref('')
const showPw = ref(false)
const error = ref('')

const brandCanvas = ref<HTMLCanvasElement | null>(null)
const interactionLevel = ref(0)     // 0=idle → 1=typing

let typingTimer: ReturnType<typeof setTimeout> | null = null
function onInputActivity() {
  interactionLevel.value = Math.min(1, interactionLevel.value + 0.15)
  if (typingTimer) clearTimeout(typingTimer)
  typingTimer = setTimeout(() => {
    const decay = setInterval(() => {
      interactionLevel.value = Math.max(0, interactionLevel.value - 0.02)
      if (interactionLevel.value <= 0) clearInterval(decay)
    }, 80)
  }, 1500)
}

function login() {
  if (!email.value.trim() || !password.value.trim()) {
    error.value = prefs.tr('login.error')
    return
  }
  auth.login(email.value, password.value)
  error.value = ''
  emit('close')
}

function register() {
  if (!email.value.trim() || !password.value.trim()) {
    error.value = prefs.tr('login.error')
    return
  }
  auth.login(email.value, password.value)
  error.value = ''
  emit('close')
}

// ── Particle Engine ──
interface Particle {
  x: number; y: number
  angle: number;   // orbit angle
  radius: number    // orbit radius
  speed: number     // orbit speed
  size: number
  opacity: number
  seed: number      // random offset for variety
}

let particles: Particle[] = []
let raf = 0
let time = 0

function initParticles(_w: number, _h: number) {
  particles = []
  const count = 45
  for (let i = 0; i < count; i++) {
    const ringIndex = Math.floor(i / 8) // 0-4 rings
    const baseRadius = 30 + ringIndex * 28 + Math.random() * 20
    particles.push({
      x: 0, y: 0,
      angle: Math.random() * Math.PI * 2,
      radius: baseRadius,
      speed: 0.3 + Math.random() * 0.7,
      size: 1.5 + Math.random() * 3,
      opacity: 0.25 + Math.random() * 0.35,
      seed: Math.random() * 1000,
    })
  }
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, glow: number) {
  const alpha = p.opacity * (0.6 + glow * 0.4)
  // Glow halo
  const haloR = p.size * (2 + glow * 1.5)
  const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, haloR)
  halo.addColorStop(0, `rgba(150,210,140,${alpha * 0.9})`)
  halo.addColorStop(0.5, `rgba(107,155,94,${alpha * 0.3})`)
  halo.addColorStop(1, 'rgba(107,155,94,0)')
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(p.x, p.y, haloR, 0, Math.PI * 2)
  ctx.fill()
  // Core dot
  ctx.fillStyle = `rgba(200,240,190,${alpha})`
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fill()
}

function drawCore(ctx: CanvasRenderingContext2D, cx: number, cy: number, glow: number) {
  const r = 14 + glow * 6
  const alpha = 0.5 + glow * 0.4

  // Outer glow
  const g1 = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 3)
  g1.addColorStop(0, `rgba(150,210,140,${alpha})`)
  g1.addColorStop(0.4, `rgba(107,155,94,${alpha * 0.4})`)
  g1.addColorStop(1, 'rgba(107,155,94,0)')
  ctx.fillStyle = g1
  ctx.beginPath()
  ctx.arc(cx, cy, r * 3, 0, Math.PI * 2)
  ctx.fill()

  // Core body
  const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  g2.addColorStop(0, `rgba(220,250,210,${alpha * 1.3})`)
  g2.addColorStop(0.5, `rgba(130,185,120,${alpha})`)
  g2.addColorStop(1, `rgba(80,130,70,${alpha * 0.2})`)
  ctx.fillStyle = g2
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fill()

  // Bright center
  ctx.fillStyle = `rgba(240,255,230,${Math.min(1, alpha * 1.5)})`
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
  ctx.fill()
}

function drawConnection(ctx: CanvasRenderingContext2D, a: Particle, b: Particle, glow: number) {
  const dist = Math.hypot(a.x - b.x, a.y - b.y)
  const maxDist = 80 + glow * 40
  if (dist > maxDist) return
  const alpha = (1 - dist / maxDist) * 0.22 * (0.5 + glow * 0.5)
  ctx.strokeStyle = `rgba(130,190,120,${alpha})`
  ctx.lineWidth = 0.6 + glow * 0.4
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number, glow: number) {
  // Subtle radial gradient that shifts with glow
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.8)
  g.addColorStop(0, `rgba(107,155,94,${0.03 + glow * 0.04})`)
  g.addColorStop(1, 'rgba(107,155,94,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
}

function animate() {
  const canvas = brandCanvas.value
  if (!canvas) {
    raf = requestAnimationFrame(animate)
    return
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const w = canvas.width
  const h = canvas.height
  const cx = w / 2
  const cy = h / 2

  time += 0.016
  const glow = interactionLevel.value

  ctx.clearRect(0, 0, w, h)
  drawBackground(ctx, w, h, glow)

  // Update & draw particles
  const orbitSpeed = 1 + glow * 2.5
  for (const p of particles) {
    p.angle += (p.speed * 0.008) * orbitSpeed
    const wobble = Math.sin(time * 1.5 + p.seed) * glow * 8
    const r = p.radius - glow * 8
    p.x = cx + Math.cos(p.angle) * (r + wobble)
    p.y = cy + Math.sin(p.angle) * (r * 0.75 + wobble * 0.6)
  }

  // Draw connections
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      drawConnection(ctx, particles[i], particles[j], glow)
    }
  }

  // Draw particles
  for (const p of particles) {
    drawParticle(ctx, p, glow)
  }

  // Draw core
  drawCore(ctx, cx, cy, glow)

  raf = requestAnimationFrame(animate)
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const canvas = brandCanvas.value
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return

  const resize = () => {
    const rect = parent.getBoundingClientRect()
    canvas.width = rect.width * 2
    canvas.height = rect.height * 2
    canvas.style.width = rect.width + 'px'
    canvas.style.height = rect.height + 'px'
    initParticles(canvas.width, canvas.height)
  }

  resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(parent)
  resize()
  raf = requestAnimationFrame(animate)
})

onUnmounted(() => {
  cancelAnimationFrame(raf)
  resizeObserver?.disconnect()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div class="login-overlay" @click.self="emit('close')">
        <div class="login-modal-wide">
          <button class="login-close" @click="emit('close')">&times;</button>
          <!-- Brand side — Canvas neural gravity well -->
          <div class="login-brand">
            <canvas ref="brandCanvas" class="brand-canvas" />
            <div class="login-brand-content">
              <div class="login-avatar">R</div>
              <h2 class="login-brand-name">RAG-DocTalk</h2>
              <p class="login-tagline">让每一份文档都有对话的能力</p>
              <div class="login-features">
                <span class="lf-item">上传文档，即刻问答</span>
                <span class="lf-item">精准引用，逐句溯源</span>
                <span class="lf-item">多模态输出，自由创作</span>
              </div>
            </div>
          </div>
          <!-- Form side -->
          <div class="login-form-side">
            <h3 class="login-form-title">{{ prefs.tr('login.title') }}</h3>
            <p class="login-form-desc">{{ prefs.tr('login.desc') }}</p>
            <div class="login-field" style="--i:1">
              <input
                v-model="email"
                type="email"
                :placeholder="prefs.tr('login.email')"
                class="login-input"
                @keyup.enter="login"
                @input="onInputActivity"
                @focus="onInputActivity"
              />
              <span class="login-input-beam" />
            </div>
            <div class="login-field" style="--i:2">
              <div class="login-pw-wrap">
                <input
                  v-model="password"
                  :type="showPw ? 'text' : 'password'"
                  :placeholder="prefs.tr('login.password')"
                  class="login-input"
                  @keyup.enter="login"
                  @input="onInputActivity"
                  @focus="onInputActivity"
                />
                <button type="button" class="login-eye" @click="showPw = !showPw">
                  <svg v-if="showPw" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
              </div>
              <span class="login-input-beam" />
            </div>
            <p v-if="error" class="login-error">{{ error }}</p>
            <div class="login-field" style="--i:3">
              <button class="login-btn" @click="login"><span class="login-btn-text">{{ prefs.tr('login.btn') }}</span></button>
            </div>
            <p class="login-switch">
              {{ prefs.tr('login.switch') }}<button class="link-btn" @click="register">{{ prefs.tr('login.register') }}</button>
            </p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.login-overlay {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: rgba(27,29,26,0.4);
  backdrop-filter: blur(8px);
}
.login-modal-wide {
  position: relative;
  display: flex;
  width: 740px; min-height: 490px;
  background: var(--brand-bg-surface);
  border-radius: 18px;
  box-shadow: 0 0 0 1px var(--brand-border), 0 20px 70px rgba(27,29,26,0.1);
  overflow: hidden;
  transition: box-shadow .6s;
}
.login-close {
  position: absolute; top: 14px; right: 14px;
  width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  background: none; border: none;
  font-size: 22px; color: var(--brand-ink-secondary);
  cursor: pointer; border-radius: 6px;
  transition: background .2s, color .2s;
  z-index: 5;
}
.login-close:hover { background: var(--brand-bg-hover); color: var(--brand-ink-primary); }

/* Brand side */
.login-brand {
  position: relative; flex: 1;
  background: linear-gradient(160deg, rgba(40,70,35,0.93) 0%, rgba(55,90,45,0.94) 100%);
  display: flex; align-items: center; justify-content: center;
  padding: 48px 36px;
  overflow: hidden;
}
.brand-canvas {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
  pointer-events: none;
}
.login-brand-content {
  position: relative; z-index: 1;
  text-align: center;
  pointer-events: none;
}
.login-avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--brand-accent);
  color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; font-weight: 700;
  font-family: var(--brand-font-display);
  margin: 0 auto 20px;
  opacity: 0;
  animation: avatarIn .5s ease-out .1s forwards;
}
@keyframes avatarIn {
  from { opacity: 0; transform: scale(.5) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.login-brand-name {
  font-family: var(--brand-font-display);
  font-size: 22px; font-weight: 700;
  color: rgba(230,245,225,0.9);
  margin: 0 0 8px;
}
.login-tagline {
  font-size: 14px;
  color: rgba(180,210,175,0.7);
  margin: 0 0 32px;
  line-height: 1.5;
}
.login-features {
  display: flex; flex-direction: column; gap: 10px;
}
.lf-item {
  font-size: 13px;
  color: rgba(150,195,145,0.65);
  font-weight: 500;
}
.lf-item::before { content: '·  '; }

/* Form side */
.login-form-side {
  flex: 1;
  padding: 48px 40px;
  display: flex; flex-direction: column;
  justify-content: center;
}
.login-form-title {
  font-family: var(--brand-font-display);
  font-size: 26px; font-weight: 600;
  color: var(--brand-ink-primary);
  margin: 0 0 6px;
}
.login-form-desc {
  font-size: 14px; color: var(--brand-ink-secondary);
  margin: 0 0 28px;
}
.login-field {
  margin-bottom: 14px;
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  opacity: 0;
  animation: itemIn .45s ease-out forwards;
  animation-delay: calc(var(--i,1) * .1s + .15s);
}
@keyframes itemIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.login-input {
  width: 100%; padding: 13px 14px;
  font-size: 15px; font-family: var(--brand-font-body);
  border: 1px solid var(--brand-border);
  border-radius: 8px;
  background: var(--brand-bg-root);
  color: var(--brand-ink-primary);
  outline: none; box-sizing: border-box;
  position: relative; z-index: 1;
  transition: border-color .3s;
}
.login-input:focus { border-color: var(--brand-accent); }
.login-input-beam {
  position: absolute; top: 50%; left: -80%;
  width: 60%; height: 200%;
  transform: translateY(-50%) rotate(15deg);
  background: linear-gradient(90deg, transparent 0%, rgba(107,155,94,0.08) 50%, transparent 100%);
  pointer-events: none;
  transition: left .6s cubic-bezier(.22,.61,.36,1);
  z-index: 0;
}
.login-input:focus ~ .login-input-beam { left: 120%; }
.login-pw-wrap { position: relative; }
.login-pw-wrap .login-input { padding-right: 44px; }
.login-eye {
  position: absolute; right: 6px; top: 50%;
  transform: translateY(-50%);
  background: none; border: none;
  cursor: pointer; padding: 6px;
  z-index: 2; opacity: .4;
  transition: opacity .2s;
  color: var(--brand-ink-secondary);
}
.login-eye:hover { opacity: 1; }
.login-error {
  font-size: 13px; color: var(--brand-danger);
  margin: 4px 0 12px;
}
.login-btn {
  width: 100%; padding: 13px;
  font-size: 16px; font-weight: 500;
  font-family: var(--brand-font-body);
  border: none; border-radius: 8px;
  background: var(--brand-accent);
  color: #fff;
  cursor: pointer;
  position: relative; overflow: hidden;
  transition: background .3s, transform .2s;
}
.login-btn:hover { background: #7DA86F; transform: translateY(-1px); }
.login-btn:active { transform: translateY(0) scale(.99); }
.login-btn-text { position: relative; z-index: 1; }
.login-btn::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.15) 50%, transparent 70%);
  transform: translateX(-100%);
  transition: none;
}
.login-btn:hover::after {
  animation: btnSweep 1.8s ease-in-out infinite;
}
@keyframes btnSweep {
  0%   { transform: translateX(-100%); }
  40%  { transform: translateX(100%); }
  40.01%{ transform: translateX(-100%); }
  100% { transform: translateX(-100%); }
}
.login-switch {
  text-align: center;
  font-size: 13px; color: var(--brand-ink-secondary);
  margin: 18px 0 0;
  opacity: 0;
  animation: itemIn .45s ease-out .6s forwards;
}
.link-btn {
  background: none; border: none;
  color: var(--brand-accent);
  cursor: pointer; font-size: 13px;
  font-family: var(--brand-font-body);
  text-decoration: underline; padding: 0;
}
.modal-enter-active { transition: opacity .3s ease-out; }
.modal-leave-active { transition: opacity .18s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-leave-to { opacity: 0; }
@media (prefers-reduced-motion: reduce) {
  .brand-canvas { display: none; }
  .login-avatar, .login-field { animation: none; opacity: 1; }
}
</style>
