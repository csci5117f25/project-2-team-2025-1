<template>
  <div class="container">
    <main class="main-content">
      <h1 class="team-title">
        <span v-if="team">{{ team.name }}</span>
        <span v-if="team"> vs {{ '' }}</span>
        <span v-else-if="loading">Loading...</span>
      </h1>

      <!-- Top nav: consistent with TeamPage -->
      <nav class="team-nav">
        <router-link :to="{ name: 'Team', params: { id: team ? String(team.id) : $route.params.id } }" class="team-nav-item" :class="{ 'active-tab': $route.name === 'Team' }">Athletes</router-link>
        <router-link :to="{ name: 'TeamGames', params: { id: team ? String(team.id) : $route.params.id } }" class="team-nav-item" :class="{ 'active-tab': $route.name === 'TeamGames' }">Games</router-link>
      </nav>

      <div class="section">
        <h2 class="section-title">GAMES</h2>
        <div v-if="loading">Loading games...</div>
        <div v-else>
          <div v-if="games.length===0" class="muted">No games yet</div>
          <ul class="games-list">
            <li v-for="g in games" :key="g.id" class="game-item">
              <div class="game-header">
                <div class="game-title">{{ team.name }} vs {{ g.opponent || 'TBD' }}</div>
                <div class="game-date">{{ formatDate(g.date) }}</div>
              </div>
              <div class="game-score">Home: {{ g.home || 0 }} &nbsp; Away: {{ g.away || 0 }}</div>
              <div class="game-actions">
                <button class="btn edit-game" @click.prevent="openEditModal(g)">Edit</button>
                <button class="btn delete-game" @click.prevent="deleteGame(g)">Delete</button>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-new-game" @click="openNewGameModal">NEW GAME</button>
      </div>

      <!-- New Game Modal (dark) -->
      <div class="modal" :class="{ 'is-active': showNewGameModal }">
        <div class="modal-background" @click="closeNewGameModal"></div>
        <div class="modal-card team-modal-card">
          <header class="modal-card-head">
            <p class="modal-card-title">Add Game</p>
            <button class="delete" aria-label="close" @click="closeNewGameModal"></button>
          </header>
          <section class="modal-card-body">
            <div class="field">
              <label class="label">Opponent</label>
              <div class="control"><input class="input" v-model="newGame.opponent" placeholder="Opponent name" /></div>
            </div>
            <div class="field">
              <label class="label">Date</label>
              <div class="control"><input class="input" type="date" v-model="newGame.date" /></div>
            </div>
            <div class="field">
              <label class="label">Home Score</label>
              <div class="control">
                <input
                  class="input"
                  type="number"
                  v-model.number="newGame.home"
                  placeholder="Home score"
                />
              </div>
            </div>
            <div class="field">
              <label class="label">Away Score</label>
              <div class="control"><input class="input" type="number" v-model.number="newGame.away" placeholder="Away score" /></div>
            </div>
          </section>
          <footer class="modal-card-foot">
            <button class="add-game-btn" @click="createGame">Add game +</button>
            <button @click="closeNewGameModal">Cancel</button>
          </footer>
        </div>
      </div>

    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp, doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db, auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'TeamGames',
  data() {
    return {
      team: null,

      games: [],

      loading: true,

      showNewGameModal: false,

      // newGame holds form values for the Add Game modal
      newGame: {
        opponent: '',
        date: '',
        home: 0,
        away: 0
      }
    }
  },
  async mounted(){
    await this.loadTeamAndGames()
  },
  methods:{
    async loadTeamAndGames() {

      this.loading = true

      const teamId = this.$route && this.$route.params && this.$route.params.id

      if (!teamId) {
        this.loading = false
        return
      }

      try {
        let uid = auth && auth.currentUser && auth.currentUser.uid

        if (!uid) {
          uid = await new Promise(resolve => {
            const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u ? u.uid : null) })
          })
        }

        if (!uid) {
          this.team = { id: teamId, name: 'Unknown Team' }
          this.games = []
          this.loading = false
          return
        }

        const teamRef = doc(db, 'users', String(uid), 'Teams', String(teamId))
        const teamSnap = await getDoc(teamRef)

        if (teamSnap.exists()) {
          this.team = { id: teamSnap.id, ...teamSnap.data() }
        }

        const gamesCol = collection(db, 'users', String(uid), 'Teams', String(teamId), 'games')
        const q = query(gamesCol, orderBy('createdAt', 'desc'))
        const snap = await getDocs(q)

        this.games = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      } catch (err) {
        console.error('Failed to load games', err)
        this.games = []
      } finally {
        this.loading = false
      }

    },
    formatDate(d) {
      if (!d) return ''

      try {
        if (typeof d === 'string') return d
        if (d.toDate) return new Date(d.toDate()).toLocaleDateString()
        return new Date(d).toLocaleDateString()
      } catch (e) {
        return ''
      }
    },

    goToEdit() {
      this.$router.push({
        name: 'Team',
        params: { id: this.team ? String(this.team.id) : this.$route.params.id }
      })
    },

    goToAddPlayer() {
      this.showAddModal = true
      this.$emit('open-add-player')
    },

    openNewGameModal() {
      this.showNewGameModal = true
    },

    closeNewGameModal() {
      this.showNewGameModal = false
    },
    async createGame() {

      try {
        const teamId = this.team && this.team.id

        if (!teamId) return alert('No team selected')

        let uid = auth && auth.currentUser && auth.currentUser.uid

        if (!uid) {
          uid = await new Promise(resolve => {
            const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u ? u.uid : null) })
          })
        }

        if (!uid) return alert('Must be signed in to add a game')

        const gamesCol = collection(db, 'users', String(uid), 'Teams', String(teamId), 'games')

        const payload = {
          opponent: (this.newGame.opponent || '').trim(),
          date: this.newGame.date || null,
          home: (typeof this.newGame.home === 'number') ? this.newGame.home : (this.newGame.home ? Number(this.newGame.home) : 0),
          away: (typeof this.newGame.away === 'number') ? this.newGame.away : (this.newGame.away ? Number(this.newGame.away) : 0),
          createdAt: serverTimestamp()
        }

        await addDoc(gamesCol, payload)

        this.closeNewGameModal()

        await this.loadTeamAndGames()

      } catch (err) {
        console.error('Failed to create game', err)
        alert('Failed to add game: ' + (err && err.message))
      }

    }
    ,
    openEditModal(game){
      const teamId = this.team && this.team.id
      if(!game || !game.id || !teamId) return alert('Missing game or team id')
      this.$router.push({ name: 'GameInfo', params: { gameId: String(game.id) }, query: { teamId: String(teamId) } })
    },
    async deleteGame(game){
      try{
        if(!confirm('Delete this game?')) return
        if(!this.team) return
        const teamId = this.team.id
        const gid = game && game.id
        if(!gid) return
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){ uid = await new Promise(resolve=>{ const unsub = onAuthStateChanged(auth,(u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid) return alert('Must be signed in to delete a game')
        const gameRef = doc(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(gid))
        await deleteDoc(gameRef)
        // remove from local list
        this.games = this.games.filter(x=>String(x.id)!==String(gid))
      }catch(err){ console.error('Failed to delete game', err); alert('Failed to delete: '+(err&&err.message)) }
    }
  },
  watch:{ '$route.params.id': async function(){ await this.loadTeamAndGames() } }
}
</script>

<style scoped>
.team-nav{display:flex;width:min(520px,90%);margin:16px auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 0 rgba(16,185,129,0.08)}
.team-nav-item{flex:1;text-align:center;padding:10px 0;background:#f3f4f6;color:#111;font-weight:600;border:0}
.team-nav-item:hover{background:#e6f9ee}
.team-nav-item.active-tab{background:#10b981;color:#fff}
.games-list{list-style:none;padding:0;margin:0}
.game-item{padding:12px;border-bottom:1px solid #eee}
.game-header{display:flex;justify-content:space-between;align-items:center}
.game-title{font-weight:700}
.game-date{color:#6b7280}
.game-score{margin-top:6px;color:#374151}
.add-game-btn{cursor:pointer;background-color:#10b981;border:none;padding:8px 14px;color:#fff;border-radius:8px;font-weight:700}
.edit-game{background:#2563eb;color:#fff;border:none;padding:6px 10px;border-radius:6px;margin-right:8px}
.delete-game{background:#ef4444;color:#fff;border:none;padding:6px 10px;border-radius:6px}
.edit-game:hover{opacity:0.9}
.delete-game:hover{opacity:0.9}
</style>
