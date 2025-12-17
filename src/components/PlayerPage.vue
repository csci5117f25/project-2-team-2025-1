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
              <img v-if="player.photo" :src="player.photo" alt="player photo" style="width:96px;height:96px;object-fit:cover;border-radius:50%;" />
              <div v-else class="has-text-centered is-size-1">🏀</div>
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
            <button v-if="activeTab === 'highlights'" class="button is-primary" @click="openAddVideo('highlight')">Add Highlight with Camera</button>
            <button v-if="activeTab === 'games'" class="button is-primary" @click="openAddVideo('game')">Add Game with Camera</button>
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
              <button class="button is-small is-danger mt-2" @click="deleteHighlight(item.id)">Delete</button>
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
                <div class="buttons mt-2">
                  <router-link
                    :to="{ name: 'GameEditor', params: { playerId: $route.params.id, gameId: game.id } }"
                    class="button is-small is-primary is-outlined"
                  >
                    Add Annotations to Video
                  </router-link>
                  <button class="button is-small is-danger" @click="deleteGame(game.id)">Delete</button>
                </div>
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
import { useCollection, useDocument, useFirestore } from 'vuefire'
import { collection, doc, deleteDoc, query, where } from 'firebase/firestore'
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AddVideoModal from './AddVideoModal.vue'

export default {
  name: 'PlayerPage',
  components: {
    AddVideoModal
  },
  setup() {
    const route = useRoute()
    const db = useFirestore()
    const playerId = computed(() => route.params.id)

    const currentPlayer = useDocument(computed(() => doc(db, 'players', playerId.value)))
    const highlights = useCollection(computed(() =>
      query(collection(db, 'highlights'), where('playerId', '==', playerId.value))
    ))
    const games = useCollection(computed(() =>
      query(collection(db, 'games'), where('playerId', '==', playerId.value))
    ))

    const player = computed(() => currentPlayer.value || { name: 'Player', number: '--' })

    return { currentPlayer, highlights, games, player }
  },
  data() {
    return {
      activeTab: 'highlights',
      showAddModal: false,
      videoType: 'highlight'
    }
  },
  methods: {
    setTab(tab){
      this.activeTab = tab
    },
    openAddVideo(type){
      this.videoType = type
      this.showAddModal = true
    },
    handleVideoSaved() {
      // VueFire automatically updates the collections
    },
    async deleteHighlight(highlightId) {
      if (!confirm('Are you sure you want to delete this highlight?')) return

      try {
        const db = useFirestore()
        await deleteDoc(doc(db, 'highlights', highlightId))
      } catch (err) {
        alert('Failed to delete highlight: ' + (err && err.message))
      }
    },
    async deleteGame(gameId) {
      if (!confirm('Are you sure you want to delete this game?')) return

      try {
        const db = useFirestore()
        await deleteDoc(doc(db, 'games', gameId))
      } catch (err) {
        alert('Failed to delete game: ' + (err && err.message))
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
