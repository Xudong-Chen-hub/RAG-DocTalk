import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'landing',
      component: () => import('../views/Landing.vue'),
    },
    {
      path: '/notes',
      name: 'notes',
      component: () => import('../views/Notes.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/work/:noteId',
      name: 'work',
      component: () => import('../views/Work.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

export default router
