import { createRouter, createWebHistory } from 'vue-router'
import TeamPage from '../components/TeamPage.vue'

const routes = [
  {
    path: '/',
    name: 'Team',
    component: TeamPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
