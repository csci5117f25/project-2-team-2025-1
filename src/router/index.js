import { createRouter, createWebHistory } from 'vue-router'
import TeamPage from '../components/TeamPage.vue'
import PlayerPage from '../components/PlayerPage.vue'
import VideoPlayer from '../components/VideoPlayer.vue'

const routes = [
  {
    path: '/',
    name: 'Team',
    component: TeamPage
  }
  ,
  {
    path: '/player/:id',
    name: 'Player',
    component: PlayerPage,
    props: true
  },
  {
    path: '/player/:playerId/game/:gameId/edit',
    name: 'GameEditor',
    component: VideoPlayer,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
