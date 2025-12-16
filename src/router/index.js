import { createRouter, createWebHistory } from 'vue-router'
import TeamsListPage from '../components/TeamsListPage.vue'
import TeamPage from '../components/TeamPage.vue'
import PlayerPage from '../components/PlayerPage.vue'
import VideoPlayer from '../components/VideoPlayer.vue'

const routes = [
  {
    path: '/',
    name: 'TeamsList',
    component: TeamsListPage
  },
  {
    path: '/team/:teamId',
    name: 'TeamPlayers',
    component: TeamPage,
    props: true
  },
  {
    path: '/team/:teamId/player/:id',
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
