import { createRouter, createWebHistory } from 'vue-router'
import TeamPage from '../components/TeamPage.vue'
import TeamGames from '../components/TeamGames.vue'
import GameInfo from '../components/GameInfo.vue'
import PlayerPage from '../components/PlayerPage.vue'
import VideoPlayer from '../components/VideoPlayer.vue'
import LoginView from '../views/LoginView.vue'
import { auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

const routes = [
  { path: '/login', name: 'Login', component: LoginView },
  {
    path: '/team/:id',
    name: 'Team',
    component: TeamPage,
    props: true
  },
  {
    path: '/team/games/:id',
    name: 'TeamGames',
    component: TeamGames,
    props: true
  }
  ,
  {
    path: '/game/info/:gameId',
    name: 'GameInfo',
    component: GameInfo,
    props: true
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

// helper to wait for auth initialization
function getCurrentUser(){
  return new Promise((resolve, reject) => {
    const remove = onAuthStateChanged(auth, (user) => { remove(); resolve(user) }, reject)
  })
}

router.beforeEach(async (to, from, next) => {
  if(to.name === 'Login') return next()
  const user = await getCurrentUser()
  if(!user) return next({ name: 'Login' })
  next()
})

export default router
