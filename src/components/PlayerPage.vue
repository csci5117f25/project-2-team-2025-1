<template>
  <div class="container">
    <section class="hero is-white">
      <div class="hero-body">
        <div class="media">
          <div class="media-left">
            <figure class="image is-96x96">
              <div class="has-text-centered is-size-1">🏀</div>
            </figure>
          </div>
          <div class="media-content">
            <p class="title is-3">{{ player.name }}</p>
            <p class="subtitle is-6" v-if="player.number && player.number !== '--'">Player ID #{{ player.number }}</p>
            <p class="subtitle is-6" v-else-if="teamsList.length">{{ teamsList.length }} team{{ teamsList.length !== 1 ? 's' : '' }}</p>
            <p class="subtitle is-6" v-else>No ID yet</p>
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

      <div v-if="activeTab === 'highlights'">
        <div v-if="!highlights.length" class="notification is-light has-text-centered">
          <strong>No highlights yet</strong>
          <p>Add your first highlight using the "Add Highlight with Camera" button above.</p>
        </div>
        <div v-else class="columns is-multiline">
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
      </div>

      <div v-if="activeTab === 'games'">
        <div v-if="!games.length" class="notification is-light has-text-centered">
          <strong>No games yet</strong>
          <p>Add your first game using the "Add Game with Camera" button above.</p>
        </div>
        <div v-else class="columns is-multiline">
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
                    :to="{ name: 'GameEditor', params: { playerId: $route.params.id, gameId: game.id }, query: { videoUrl: game.videoUrl || '' } }"
                    class="button is-small is-primary is-outlined"
                  >
                    Edit Game
                  </router-link>
                  <button class="button is-small is-danger" @click="deleteGame(game.id)">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="activeTab === 'stats'">
        <div class="box">
          <div class="field">
            <label class="label">Team</label>
            <div class="field has-addons">
              <div class="control is-expanded">
                <div class="select is-fullwidth">
                  <select v-model="selectedTeamId" @change="loadRecentGamesForSelectedTeam">
                    <option disabled value="">Select a team</option>
                    <option v-for="t in teamsList" :key="t.id" :value="t.id">{{ t.name }} {{ t.season ? '(' + t.season + ')' : '' }}</option>
                  </select>
                </div>
              </div>
              <div class="control">
                <button class="button is-danger" @click="deleteTeam" :disabled="!selectedTeamId">Delete Team</button>
              </div>
            </div>
          </div>

          <div v-if="!teamsList.length" class="notification is-light has-text-centered">
            <strong>No teams found</strong>
            <p>Link this athlete to a team to start tracking stats.</p>
          </div>
          <div v-else-if="!recentGames.length" class="notification is-light has-text-centered">
            <strong>No stats yet</strong>
            <p>Once games are recorded for this team, they will appear here.</p>
          </div>
          <template v-else>
            <div v-if="statSummary.length" class="table-container mb-5">
              <table class="table is-fullwidth is-striped">
                <thead>
                  <tr>
                    <th>Stat</th>
                    <th>Total</th>
                    <th>Average</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in statSummary" :key="item.key">
                    <td>{{ formatStatLabel(item.key) }}</td>
                    <td>{{ formatNumber(item.total) }}</td>
                    <td>{{ formatNumber(item.average) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="recent-games table-container">
              <table class="table is-fullwidth is-striped">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Home</th>
                    <th>Away</th>
                    <th v-for="key in statKeys" :key="'head-' + key">{{ formatStatLabel(key) }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="rg in recentGames" :key="rg.gameId">
                    <td>{{ rg.date || 'TBD' }}</td>
                    <td>{{ rg.opponent }}</td>
                    <td>{{ rg.home }}</td>
                    <td>{{ rg.away }}</td>
                    <td v-for="key in statKeys" :key="rg.gameId + '-' + key">{{ displayStatValue(rg.stats, key) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </div>

      <!-- Shared AddVideoModal uploader -->
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
import { doc, getDoc, collection, getDocs, query, where, deleteDoc, updateDoc } from 'firebase/firestore'
import { db, auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  components: { AddVideoModal },
  name: 'PlayerPage',
  data() {
    return {
      players: [],
      highlights: [],
      games: [],
      activeTab: 'highlights',
      showAddModal: false,
      videoType: 'highlight',
      teamsList: [],
      selectedTeamId: '',
      recentGames: [],
      statKeys: [],
      statSummary: [],
      athlete: null
    }
  },
  async mounted(){
    await this.loadTeamsForPlayer()
    await this.loadHighlights()
    await this.loadGames()
  },
  methods: {
    async setTab(tab){
      this.activeTab = tab
      if(tab === 'stats'){
        try{
          await this.loadTeamsForPlayer()
        }catch(e){ console.warn('Error preparing stats tab', e) }
      }
    },
    openAddVideo(type){
      this.videoType = type || 'highlight'
      this.showAddModal = true
    },
    async handleVideoSaved(type){
      // refresh lists after upload
      await this.loadHighlights()
      await this.loadGames()
      this.showAddModal = false
    },
    async loadHighlights(){
      try{
        const playerId = String(this.$route.params.id || '1')
        const q = query(collection(db, 'highlights'), where('playerId', '==', playerId))
        const snap = await getDocs(q)
        const items = []
        snap.forEach(d => items.push(Object.assign({ id: d.id }, d.data())))
        // sort newest first
        items.sort((a,b)=>{ const ta = a.createdAt ? Date.parse(a.createdAt) : 0; const tb = b.createdAt ? Date.parse(b.createdAt) : 0; return tb - ta })
        this.highlights = items
      }catch(e){ console.warn('loadHighlights failed', e) }
    },
    async loadGames(){
      try{
        const playerId = String(this.$route.params.id || '1')
        const q = query(collection(db, 'games'), where('playerId', '==', playerId))
        const snap = await getDocs(q)
        const items = []
        snap.forEach(d => items.push(Object.assign({ id: d.id }, d.data())))
        items.sort((a,b)=>{ const ta = a.createdAt ? Date.parse(a.createdAt) : 0; const tb = b.createdAt ? Date.parse(b.createdAt) : 0; return tb - ta })
        this.games = items
      }catch(e){ console.warn('loadGames failed', e) }
    },
    async deleteHighlight(id){
      try{
        if(!confirm('Are you sure you want to delete this highlight?')) return
        await deleteDoc(doc(db, 'highlights', String(id)))
        await this.loadHighlights()
      }catch(e){ alert('Failed to delete highlight: ' + (e && e.message)) }
    },
    async deleteGame(id){
      try{
        if(!confirm('Are you sure you want to delete this game?')) return
        await deleteDoc(doc(db, 'games', String(id)))
        await this.loadGames()
      }catch(e){ alert('Failed to delete game: ' + (e && e.message)) }
    },
    async deleteTeam(){
      try{
        if(!this.selectedTeamId) return
        const teamName = this.teamsList.find(t => t.id === this.selectedTeamId)?.name || 'this team'
        if(!confirm(`Are you sure you want to remove ${teamName} from this athlete? This will not delete the team itself, only unlink it from this athlete.`)) return

        const playerId = String(this.$route.params.id || '1')
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){ uid = await new Promise(resolve=>{ const unsub = onAuthStateChanged(auth,(u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid) return

        const athleteRef = doc(db, 'users', String(uid), 'athletes', String(playerId))
        const athleteSnap = await getDoc(athleteRef)
        if(!athleteSnap.exists()) return

        const athlete = athleteSnap.data()
        const teamRefs = athlete.team || []
        const updatedTeamRefs = teamRefs.filter(tr => {
          try{
            const path = tr && tr.path ? tr.path : (tr && tr._path && tr._path.segments && tr._path.segments.join('/'))
            return !path || !path.includes(`/Teams/${this.selectedTeamId}`)
          }catch(e){ return true }
        })

        await updateDoc(athleteRef, { team: updatedTeamRefs })

        this.selectedTeamId = ''
        this.recentGames = []
        this.statKeys = []
        this.statSummary = []
        await this.loadTeamsForPlayer()
      }catch(e){ alert('Failed to delete team: ' + (e && e.message)) }
    },
    async ensureChartJs(){
      if(window && window.Chart) return Promise.resolve()
      return new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = 'https://cdn.jsdelivr.net/npm/chart.js'
        s.onload = () => resolve()
        s.onerror = (e) => reject(e)
        document.head.appendChild(s)
      })
    },
    async renderChart(){
      try{
        await this.ensureChartJs()
        const canvas = document.getElementById('playerStatChart')
        if(!canvas) return

        const pts = (this.datapoints || []).map(d => ({
          x: d.x !== undefined ? d.x : null,
          y: (d.Stat !== null && d.Stat !== undefined) ? Number(d.Stat) : null,
          date: d.date || null
        })).filter(p => p.x !== null)

        if(this.chart){ try{ this.chart.destroy() }catch(e){} this.chart = null }

        const ctx = (canvas && canvas.getContext) ? canvas.getContext('2d') : null
        try{
          if(ctx){
            this.chart = new window.Chart(ctx, {
              type: 'scatter',
              data: {
                datasets: [{ label: (this.selectedStat || 'stat'), data: pts, backgroundColor: '#2563eb' }]
              },
              options: {
                scales: {
                  x: { type: 'linear', title: { display: true, text: 'Game (oldest → newest)' }, ticks: { stepSize: 1 } },
                  y: { beginAtZero: true, title: { display: true, text: 'Value' } }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context){
                        const r = context.raw || {}
                        return `${r.date ? r.date + ' — ' : ''}Value: ${r.y}`
                      }
                    }
                  }
                }
              }
            })
          } else {
            // fallback: try passing canvas element directly
            this.chart = new window.Chart(canvas, {
              type: 'scatter',
              data: {
                datasets: [{ label: (this.selectedStat || 'stat'), data: pts, backgroundColor: '#2563eb' }]
              },
              options: {
                scales: {
                  x: { type: 'linear', title: { display: true, text: 'Game (oldest → newest)' }, ticks: { stepSize: 1 } },
                  y: { beginAtZero: true, title: { display: true, text: 'Value' } }
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context){
                        const r = context.raw || {}
                        return `${r.date ? r.date + ' — ' : ''}Value: ${r.y}`
                      }
                    }
                  }
                }
              }
            })
          }
        }catch(e){
          console.warn('Chart init failed, context available:', !!ctx, e)
          return
        }
      }catch(err){ console.warn('Chart build failed', err) }
    },
    async loadTeamsForPlayer(){
      try{
        const playerId = String(this.$route.params.id || '1')
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){ uid = await new Promise(resolve=>{ const unsub = onAuthStateChanged(auth,(u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid) return
        const athleteRef = doc(db, 'users', String(uid), 'athletes', String(playerId))
        const athleteSnap = await getDoc(athleteRef)
        if(!athleteSnap.exists()) return
        const athlete = athleteSnap.data()
        this.athlete = Object.assign({ id: athleteSnap.id }, athlete)
        const teamRefs = athlete.team || []
        const list = []
        for(const tr of teamRefs){
          try{
            const tRef = tr && tr.path ? doc(db, ...tr.path.split('/')) : tr
            const tsnap = await getDoc(tRef)
            if(tsnap.exists()) list.push({ id: tsnap.id, ...tsnap.data() })
          }catch(e){ continue }
        }
        this.teamsList = list
        if(list.length>0){ this.selectedTeamId = this.selectedTeamId || String(list[0].id); await this.loadRecentGamesForSelectedTeam() }
      }catch(err){ console.warn('Failed to load teams for player', err) }
    },
    async loadRecentGamesForSelectedTeam(){
      try{
        this.recentGames = []
        this.statKeys = []
        this.statSummary = []
        const playerId = String(this.$route.params.id || '1')
        const teamId = this.selectedTeamId
        if(!teamId) return
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){ uid = await new Promise(resolve=>{ const unsub = onAuthStateChanged(auth,(u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid) return

        const athleteRef = doc(db, 'users', String(uid), 'athletes', String(playerId))
        const aSnap = await getDoc(athleteRef)
        if(!aSnap.exists()) return
        const athlete = aSnap.data()
        const gamesRefs = athlete.games || []

        const filtered = gamesRefs.filter(gr => {
          try{ const p = gr.path || (gr && gr._path && gr._path.segments && gr._path.segments.join('/')) ; return p && p.includes(`/Teams/${teamId}/games/`) }catch(e){ return false }
        })

        const rows = []
        const allKeysSet = new Set()
        const numericKeysSet = new Set()
        for(const gref of filtered){
          try{
            const gSnap = await getDoc(gref)
            if(!gSnap.exists()) continue
            const g = { id: gSnap.id, ...gSnap.data() }
            const playerDocRef = doc(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(g.id), 'players', String(playerId))
            const pSnap = await getDoc(playerDocRef)
            const rawStats = pSnap.exists() ? pSnap.data() : {}
            const cleanedStats = {}
            for (const key in rawStats){
              if(!Object.prototype.hasOwnProperty.call(rawStats, key)) continue
              if(key === 'athleteId' || key === 'playerId') continue
              const value = rawStats[key]
              if(value === null || value === undefined) continue
              cleanedStats[key] = value
              allKeysSet.add(key)
              if(typeof value === 'number') numericKeysSet.add(key)
            }
            rows.push({
              gameId: g.id,
              date: g.date || null,
              opponent: g.opponent || '',
              home: g.home || 0,
              away: g.away || 0,
              stats: cleanedStats
            })
          }catch(e){ console.warn('failed reading game ref', e); continue }
        }

        rows.sort((a,b)=>{
          const da = Date.parse(a.date) || 0
          const dateB = Date.parse(b.date) || 0
          return dateB - da
        })

        const trimmed = rows.slice(0, 10)
        this.recentGames = trimmed
        const totals = {}
        for(const game of trimmed){
          const stats = game.stats || {}
          for(const key of Object.keys(stats)){
            if(typeof stats[key] !== 'number') continue
            totals[key] = (totals[key] || 0) + stats[key]
          }
        }
        this.statKeys = Array.from(allKeysSet)
        const gameCount = trimmed.length
        this.statSummary = Array.from(numericKeysSet).map(key => ({
          key,
          total: totals[key] || 0,
          average: gameCount ? (totals[key] || 0) / gameCount : 0
        }))
      }catch(err){ console.error('Failed to load recent games', err) }
    },
    formatStatLabel(key){
      if(!key) return ''
      return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    },
    formatNumber(value){
      if(value === null || value === undefined || Number.isNaN(value)) return '-'
      const num = Number(value)
      if(Number.isNaN(num)) return '-'
      return Number.isInteger(num) ? num : num.toFixed(1)
    },
    displayStatValue(stats, key){
      if(!stats || stats[key] === null || stats[key] === undefined) return '-'
      const value = stats[key]
      return typeof value === 'number' ? this.formatNumber(value) : value
    }
  },
  computed: {
    player() {
      if(this.athlete && (this.athlete.name || this.athlete.number !== undefined)){
        return { name: this.athlete.name || 'Player', number: this.athlete.number || '--' }
      }
      const id = String(this.$route.params.id || '1')
      return this.players.find(p => p.id === id) || { name: 'Player', number: '--' }
    }
  }
}
</script>

<style scoped>
.video-placeholder{display:flex;align-items:center;justify-content:center;background:#f6f6f6}
.play-icon{font-size:36px;color:#777}
.card{height:100%}
.table-container{max-height:320px;overflow:auto;border:1px solid #e5e7eb;border-radius:8px;padding:8px}
</style>
