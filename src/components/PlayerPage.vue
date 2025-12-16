<template>
  <div class="container">
    <section class="hero is-white">
      <div class="hero-body">
        <router-link :to="{ name: 'TeamPlayers', params: { teamId: $route.params.teamId } }" class="button is-text mb-3">
          <span class="icon">←</span>
          <span>Back to Athletes</span>
        </router-link>
        <div class="media">
          <div class="media-left">
            <figure class="image is-96x96">
              <div class="has-text-centered is-size-1">🏀</div>
            </figure>
          </div>
          <div class="media-content">
            <p class="title is-3">{{ player.name }}</p>
            <p class="subtitle is-6">CLASS OF 2027 &nbsp; <strong>#{{ player.number }}</strong></p>
          </div>
        </div>
      </div>
    </section>

    <div class="tabs is-boxed is-fullwidth">
      <ul>
        <li :class="{ 'is-active': activeTab === 'highlights' }"><a @click.prevent="setTab('highlights')">HIGHLIGHTS</a></li>
        <li :class="{ 'is-active': activeTab === 'games' }"><a @click.prevent="setTab('games')">GAMES</a></li>
        <li :class="{ 'is-active': activeTab === 'stats' }"><a @click.prevent="setTab('stats')">STATS</a></li>
      </ul>
    </div>

    <section class="section">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <h2 class="title is-5">{{ activeTab === 'highlights' ? 'Highlights' : activeTab === 'games' ? 'Games' : 'Stats' }}</h2>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <button v-if="activeTab === 'highlights'" class="button is-primary" @click="openAddVideo('highlight')">Add Highlight</button>
            <button v-if="activeTab === 'games'" class="button is-primary" @click="openAddVideo('game')">Add Game</button>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'highlights'" class="columns is-multiline">
        <div class="column is-half" v-for="item in highlights" :key="item.id">
          <div class="card">
            <div class="card-image">
              <figure class="image is-16by9 video-placeholder">
                <template v-if="item.videoUrl">
                  <video :src="item.videoUrl" controls style="width:100%;height:100%;object-fit:cover"></video>
                </template>
                <template v-else>
                  <div class="play-icon">▶</div>
                </template>
              </figure>
            </div>
            <div class="card-content">
              <p class="title is-6">{{ item.title }}</p>
              <p class="subtitle is-7">{{ item.date }}</p>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'games'">
        <div class="columns is-multiline">
          <div class="column is-half" v-for="game in games" :key="game.id">
            <div class="card">
              <div class="card-image">
                <figure class="image is-16by9 video-placeholder">
                  <template v-if="game.videoUrl">
                    <video :src="game.videoUrl" controls style="width:100%;height:100%;object-fit:cover"></video>
                  </template>
                  <template v-else>
                    <div class="play-icon">▶</div>
                  </template>
                </figure>
              </div>
              <div class="card-content">
                <p class="title is-6">{{ game.title }}</p>
                <p class="subtitle is-7">{{ game.date }}</p>
                <router-link
                  :to="{ name: 'GameEditor', params: { playerId: $route.params.id, gameId: game.id } }"
                  class="button is-small is-primary is-outlined mt-2"
                >
                  Edit Game
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'stats'">
        <div class="notification is-light has-text-centered">
          <strong>No stats available</strong>
          <p>Statistics will appear here once data is added for this player.</p>
        </div>
      </div>

      <!-- Add Video Modal -->
      <AddVideoModal
        :show="showAddModal"
        :videoType="videoType"
        :playerId="$route.params.id"
        @close="showAddModal = false"
        @saved="handleVideoSaved"
      />
    </section>
  </div>
</template>

<script>
import AddVideoModal from './AddVideoModal.vue'

export default {
  name: 'PlayerPage',
  components: {
    AddVideoModal
  },
  data() {
    return {
      currentPlayer: null,
      highlights: [],
      games: [],
      activeTab: 'highlights',
      showAddModal: false,
      videoType: 'highlight'
    }
  },
  async mounted() {
    await this.loadPlayer()
    await this.loadHighlights()
    await this.loadGames()
  },
  computed: {
    player() {
      return this.currentPlayer || { name: 'Player', number: '--' }
    }
  },
  methods: {
    async loadPlayer() {
      try {
        const { doc, getDoc } = await import('firebase/firestore')
        const { db } = await import('../firebase.js')

        const playerId = this.$route.params.id
        const playerRef = doc(db, 'players', playerId)
        const playerSnap = await getDoc(playerRef)

        if (playerSnap.exists()) {
          this.currentPlayer = { id: playerSnap.id, ...playerSnap.data() }
        }
      } catch (err) {
        console.error('Failed to load player', err)
      }
    },
    async loadHighlights() {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const { db } = await import('../firebase.js')

        const playerId = this.$route.params.id
        const highlightsCol = collection(db, 'highlights')
        const q = query(highlightsCol, where('playerId', '==', playerId))
        const snapshot = await getDocs(q)
        this.highlights = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (err) {
        console.error('Failed to load highlights', err)
      }
    },
    async loadGames() {
      try {
        const { collection, getDocs, query, where } = await import('firebase/firestore')
        const { db } = await import('../firebase.js')

        const playerId = this.$route.params.id
        const gamesCol = collection(db, 'games')
        const q = query(gamesCol, where('playerId', '==', playerId))
        const snapshot = await getDocs(q)
        this.games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (err) {
        console.error('Failed to load games', err)
      }
    },
    setTab(tab){
      this.activeTab = tab
    },
    openAddVideo(type){
      this.videoType = type
      this.showAddModal = true
    },
    handleVideoSaved(type) {
      if (type === 'highlight') {
        this.loadHighlights()
      } else {
        this.loadGames()
      }
    }
  }
}
</script>

<style scoped>
.video-placeholder{display:flex;align-items:center;justify-content:center;background:#f6f6f6}
.play-icon{font-size:36px;color:#777}
.card{height:100%}
</style>
