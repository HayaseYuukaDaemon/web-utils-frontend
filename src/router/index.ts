import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [{
      path: '/vault',
      name: 'vault',
      component: () => import('../views/VaultView.vue')
    },{
      path: '/auth',
      name: 'auth',
      component: () => import('../views/AuthView.vue')
    },{
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('../views/NotFoundView.vue')
    }
  ],
})

export default router
