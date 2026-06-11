import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<{ email: string; name: string } | null>(null)
  const isAuthenticated = computed(() => user.value !== null)

  function login(email: string, password: string) {
    // Phase 2: fake login — accept any non-empty credentials
    if (email && password) {
      user.value = { email, name: email.split('@')[0] }
      return true
    }
    return false
  }

  function register(email: string, password: string) {
    // Phase 2: fake register
    return login(email, password)
  }

  function logout() {
    user.value = null
  }

  return { user, isAuthenticated, login, register, logout }
})
