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
            <p class="subtitle is-6"><strong>#{{ player.number }}</strong></p>
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
            <h2 class="title is-5">Highlights</h2>
          </div>
        </div>
        <div class="level-right">
          <div class="level-item">
            <button class="button is-primary" @click="openAddHighlight">Add Highlight</button>
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
        <div class="box">
          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Stat</label>
            </div>
            <div class="field-body">
              <div class="field">
                <div class="control">
                  <div class="select">
                    <select v-model="selectedStat" @change="renderChart">
                      <option v-for="s in statOptions" :key="s.key" :value="s.key">{{ s.label }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <canvas id="playerStatChart" style="width:100%;max-height:360px"></canvas>
            <div class="box" style="margin-top:12px;white-space:pre-wrap">
              <strong>datapoints:</strong>
              <pre style="margin-top:6px">{{ JSON.stringify(datapoints, null, 2) }}</pre>
            </div>
          </div>
        
          <!-- Team selector and recent games table -->
          <div class="field" style="margin-top:18px">
            <label class="label">Team</label>
            <div class="control">
              <div class="select">
                <select v-model="selectedTeamId" @change="loadRecentGamesForSelectedTeam">
                  <option v-for="t in teamsList" :key="t.id" :value="t.id">{{ t.name }} {{ t.season ? '('+t.season+')' : '' }}</option>
                </select>
              </div>
            </div>
          </div>

          <div class="recent-games table-container">
            <table class="table is-fullwidth is-striped">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Opponent</th>
                  <th>Home</th>
                  <th>Away</th>
                  <th>Stat</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="rg in recentGames" :key="rg.gameId">
                  <td>{{ rg.date || 'TBD' }}</td>
                  <td>{{ rg.opponent }}</td>
                  <td>{{ rg.home }}</td>
                  <td>{{ rg.away }}</td>
                  <td>{{ (rg.stats && (rg.stats[selectedStat] !== undefined)) ? rg.stats[selectedStat] : '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Add Highlight Modal -->
      <div class="modal" :class="{ 'is-active': showAddHighlight }">
        <div class="modal-background" @click="closeAddHighlight"></div>
        <div class="modal-card">
          <header class="modal-card-head">
            <p class="modal-card-title">Add Highlight</p>
            <button class="delete" aria-label="close" @click="closeAddHighlight"></button>
          </header>
          <section class="modal-card-body">
            <div class="tabs is-toggle is-fullwidth">
              <ul>
                <li :class="{ 'is-active': addTab === 'upload' }"><a @click.prevent="addTab='upload'">Upload</a></li>
                <li :class="{ 'is-active': addTab === 'record' }"><a @click.prevent="addTab='record'">Record</a></li>
              </ul>
            </div>

            <div v-if="addTab === 'upload'">
              <div class="field">
                <label class="label">Title</label>
                <div class="control"><input class="input" v-model="highlightForm.title" placeholder="Highlight title" /></div>
              </div>
              <div class="field">
                <label class="label">Video file</label>
                <div class="control">
                  <input type="file" accept="video/*" @change="onHighlightFileChange" />
                </div>
              </div>
              <div v-if="highlightForm.previewUrl" class="box">
                <video :src="highlightForm.previewUrl" controls style="width:100%;max-height:320px;object-fit:cover"></video>
              </div>
            </div>

            <div v-if="addTab === 'record'">
              <div class="field">
                <label class="label">Title</label>
                <div class="control"><input class="input" v-model="highlightForm.title" placeholder="Highlight title" /></div>
              </div>
              <div class="field">
                <div class="control">
                  <video ref="recPreview" autoplay playsinline muted style="width:100%;height:240px;background:#000"></video>
                </div>
              </div>
              <div class="field is-grouped">
                <div class="control">
                  <button class="button is-danger" @click="startRecording" :disabled="recording">Start</button>
                </div>
                <div class="control">
                  <button class="button" @click="stopRecording" :disabled="!recording">Stop</button>
                </div>
              </div>
              <div v-if="highlightForm.previewUrl" class="box">
                <p class="subtitle is-6">Recorded preview</p>
                <video :src="highlightForm.previewUrl" controls style="width:100%;max-height:320px;object-fit:cover"></video>
              </div>
            </div>
          </section>
          <footer class="modal-card-foot">
            <button class="button is-success" @click="submitHighlight">Save</button>
            <button class="button" @click="closeAddHighlight">Cancel</button>
          </footer>
        </div>
      </div>
    </section>
  </div>
</template>

<script>
import { doc, getDoc, collection, getDocs } from 'firebase/firestore'
import { db, auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'PlayerPage',
  data() {
    return {
      players: [
        { id: '1', name: 'PLAYER', number: '0' },
        { id: '2', name: 'PLAYER 2', number: '2' },
        { id: '3', name: 'PLAYER 3', number: '3' },
        { id: '4', name: 'REESE', number: '4' },
        { id: '5', name: 'JACK H.', number: '5' }
      ],
      highlights: [
        { id: 1, title: 'A vs B', date: '3/4/25', videoUrl: null },
        { id: 2, title: 'C vs D', date: '4/9/25', videoUrl: null },
        { id: 3, title: 'E vs F', date: '1/2/25', videoUrl: null },
        { id: 4, title: 'G vs H', date: '2/12/25', videoUrl: null }
      ],
      games: [
        { id: 1, title: 'Roseville vs Woodbridge', date: '3/4/21', videoUrl: null },
        { id: 2, title: 'Roseville vs CDM', date: '4/9/24', videoUrl: null },
        { id: 3, title: 'Roseville vs CJW', date: '1/2/23', videoUrl: null },
        { id: 4, title: 'Roseville vs ...', date: '', videoUrl: null }
      ],
      activeTab: 'highlights',
      showAddHighlight: false,
      addTab: 'upload',
      highlightForm: {
        title: '',
        date: '',
        file: null,
        previewUrl: null
      },
      recording: false,
      mediaStream: null,
      mediaRecorder: null,
      recordedChunks: [],
      createdUrls: [],
      // team & recent games
      teamsList: [],
      selectedTeamId: null,
      recentGames: [],
      teamStatKeys: [],
      athlete: null,
      datapoints: [],
      // chart/stat state
      statOptions: [
        { key: 'points', label: 'Points' },
        { key: 'rebounds', label: 'Rebounds' },
        { key: 'assists', label: 'Assists' },
        { key: 'turnovers', label: 'Turnovers' },
        { key: 'fga', label: 'Field Goal Attempts' },
        { key: 'fgm', label: 'Field Goals Made' },
        { key: 'two_pa', label: '2-Point Attempts' },
        { key: 'two_pm', label: '2-Points Made' },
        { key: 'three_pa', label: '3-Point Attempts' },
        { key: 'three_pm', label: '3-Points Made' },
        { key: 'fouls', label: 'Fouls' }
      ],
      selectedStat: 'points',
      chart: null
    }
  },
  async mounted(){
    await this.loadTeamsForPlayer()
  },
  methods: {
    setTab(tab){
      this.activeTab = tab
      if(tab === 'stats'){
        // render chart shortly after DOM updates
        this.$nextTick(()=>{ this.renderChart() })
      }
    },
    openAddHighlight(){
      this.showAddHighlight = true
      this.addTab = 'upload'
      this.highlightForm = { title: '', date: new Date().toLocaleDateString(), file: null, previewUrl: null }
    },
    closeAddHighlight(){
      this.showAddHighlight = false
      // stop camera if active
      if(this.mediaRecorder && this.recording){
        this.mediaRecorder.stop()
      }
      if(this.mediaStream){
        this.mediaStream.getTracks().forEach(t => t.stop())
        this.mediaStream = null
      }
      // revoke preview URL if it was created during modal
      if(this.highlightForm && this.highlightForm.previewUrl && this.createdUrls.includes(this.highlightForm.previewUrl)){
        URL.revokeObjectURL(this.highlightForm.previewUrl)
        this.createdUrls = this.createdUrls.filter(u => u !== this.highlightForm.previewUrl)
      }
      this.highlightForm = { title: '', date: '', file: null, previewUrl: null }
      this.recording = false
    },
    onHighlightFileChange(e){
      const file = e.target.files && e.target.files[0]
      if(!file) return
      this.highlightForm.file = file
      if(this.highlightForm.previewUrl && this.createdUrls.includes(this.highlightForm.previewUrl)){
        URL.revokeObjectURL(this.highlightForm.previewUrl)
        this.createdUrls = this.createdUrls.filter(u => u !== this.highlightForm.previewUrl)
      }
      const url = URL.createObjectURL(file)
      this.highlightForm.previewUrl = url
      this.createdUrls.push(url)
    },
    async submitHighlight(){
      const id = Date.now()
      const title = this.highlightForm.title || 'Highlight'
      const date = this.highlightForm.date || new Date().toLocaleDateString()

      // upload to fire and get link
      let finalUrl = this.highlightForm.previewUrl || null
      try{
        if(this.highlightForm.file){
          const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')
          const { storage, db } = await import('../firebase.js')
          const path = `players/${this.$route.params.id || 'unknown'}/highlights/${id}`
          const r = storageRef(storage, path)
          await uploadBytes(r, this.highlightForm.file)
          finalUrl = await getDownloadURL(r)

          // save metadata to Firestore
          const { doc, setDoc, collection } = await import('firebase/firestore')
          const docRef = doc(collection(db, 'highlights'), String(id))
          await setDoc(docRef, {
            id: String(id),
            playerId: String(this.$route.params.id || '1'),
            title,
            date,
            videoUrl: finalUrl,
            createdAt: new Date().toISOString()
          })
        }
      }catch(err){
        console.error('Upload failed', err)
        alert('Upload failed: ' + (err && err.message))
      }

      this.highlights.unshift({ id, title, date, videoUrl: finalUrl })
      this.closeAddHighlight()
    },
    async startRecording(){
      try{
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        this.mediaStream = stream
        const videoEl = this.$refs.recPreview
        if(videoEl){
          videoEl.srcObject = stream
        }
        this.recordedChunks = []
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
        this.mediaRecorder.ondataavailable = (e) => { if(e.data && e.data.size) this.recordedChunks.push(e.data) }
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
          const url = URL.createObjectURL(blob)
          this.highlightForm.previewUrl = url
          this.createdUrls.push(url)
        }
        this.mediaRecorder.start()
        this.recording = true
      }catch(err){
        console.error('Camera error', err)
        alert('Unable to access camera: ' + (err && err.message))
      }
    },
    stopRecording(){
      if(this.mediaRecorder && this.recording){
        this.mediaRecorder.stop()
      }
      if(this.mediaStream){
        this.mediaStream.getTracks().forEach(t => t.stop())
        this.mediaStream = null
      }
      this.recording = false
    }

    ,
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

    getPlayerStatFromGame(game, playerId, statKey){
      if(!game) return null
      const tryContainers = ['players','playerStats','stats','playersData']
      for(const c of tryContainers){
        const cont = game[c]
        if(!cont) continue
        if(Array.isArray(cont)){
          const found = cont.find(p => String(p.athleteId || p.id) === String(playerId))
          if(found && (statKey in found)) return found[statKey]
        } else if(typeof cont === 'object'){
          // keyed by athlete id
          const item = cont[String(playerId)] || cont[playerId]
          if(item && (statKey in item)) return item[statKey]
        }
      }
      // fallback: maybe game has top-level mapping by player id
      if(game[String(playerId)]){
        const it = game[String(playerId)]
        if(statKey in it) return it[statKey]
      }
      return null
    },

    async renderChart(){
      try{
        await this.ensureChartJs()
        const canvas = document.getElementById('playerStatChart')
        if(!canvas) return

        // prepare points: datapoints must have x (order) and Stat (y)
        const pts = (this.datapoints || []).map(d => ({
          x: d.x !== undefined ? d.x : null,
          y: (d.Stat !== null && d.Stat !== undefined) ? Number(d.Stat) : null,
          date: d.date || null
        })).filter(p => p.x !== null)

        if(this.chart){ try{ this.chart.destroy() }catch(e){} this.chart = null }

        this.chart = new Chart(canvas.getContext('2d'), {
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
      }catch(err){ console.warn('Chart build failed', err) }
    }
    ,
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
        for(const gref of filtered){
          try{
            const gSnap = await getDoc(gref)
            if(!gSnap.exists()) continue
            const g = { id: gSnap.id, ...gSnap.data() }
            const playerDocRef = doc(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(g.id), 'players', String(playerId))
            const pSnap = await getDoc(playerDocRef)
            const stats = pSnap.exists() ? pSnap.data() : {}
            rows.push(Object.assign({ gameId: g.id, date: g.date || null, opponent: g.opponent || '', home: g.home || 0, away: g.away || 0, stats }, {}))
          }catch(e){ console.warn('failed reading game ref', e); continue }
        }

        rows.sort((a,b)=>{
          const da = Date.parse(a.date) || 0
          const db = Date.parse(b.date) || 0
          return db - da
        })

        this.recentGames = rows.slice(0,10)
        // build datapoints array from the table rows for the selected stat
        try{
          this.datapoints = this.recentGames.map(r => ({ date: r.date || null, Stat: (r.stats && r.stats[this.selectedStat] !== undefined) ? r.stats[this.selectedStat] : null }))

          // compute x ordering (oldest => 1)
          const parsed = this.datapoints.map(d => ({ ...d, _ts: d.date ? Date.parse(d.date) : null }))
          const sortedTimes = parsed.map(p => p._ts).filter(t => t !== null).sort((a,b)=>a-b)
          const maxIndex = sortedTimes.length
          this.datapoints = parsed.map(p => {
            const x = p._ts !== null ? (sortedTimes.indexOf(p._ts) + 1) : (maxIndex + 1)
            return { date: p.date || null, Stat: p.Stat, x }
          })
        }catch(e){ this.datapoints = [] }
        // render chart from table values when available
        if(this.recentGames && this.recentGames.length){




          
          this.$nextTick(()=>{ if(this.activeTab === 'stats') this.renderChart() })
        } else {
          if(this.chart){ try{ this.chart.destroy() }catch(e){} this.chart = null }
        }
      }catch(err){ console.error('Failed to load recent games', err) }
    }
  },
  watch: {
    selectedStat(newVal){
      try{
        const base = (this.recentGames || []).map(r => ({ date: r.date || null, Stat: (r.stats && r.stats[newVal] !== undefined) ? r.stats[newVal] : null }))
        const parsed = base.map(d => ({ ...d, _ts: d.date ? Date.parse(d.date) : null }))
        const sorted = parsed.map(p => p._ts).filter(t => t !== null).sort((a,b)=>a-b)
        const maxIndex = sorted.length
        this.datapoints = parsed.map(p => {
          const x = p._ts !== null ? (sorted.indexOf(p._ts) + 1) : (maxIndex + 1)
          return { date: p.date || null, Stat: p.Stat, x }
        })
      }catch(e){ this.datapoints = [] }
      if(this.activeTab === 'stats') this.$nextTick(()=>{ this.renderChart() })
    }
  },
  beforeUnmount(){
    // revoke any object URLs we created
    if(this.createdUrls && this.createdUrls.length){
      this.createdUrls.forEach(u => { try{ URL.revokeObjectURL(u) }catch(e){} })
      this.createdUrls = []
    }
    if(this.mediaStream){
      this.mediaStream.getTracks().forEach(t => t.stop())
      this.mediaStream = null
    }
    if(this.chart){ try{ this.chart.destroy() }catch(e){} this.chart = null }
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
