<template>
  <div class="container">
    <main class="main-content">
      <h1 class="team-title">Edit Game</h1>

      <div v-if="loading">Loading...</div>
      <div v-else>
        <div class="field">
          <label class="label">Opponent</label>
          <div class="control"><input class="input" v-model="game.opponent" /></div>
        </div>
        <div class="field">
          <label class="label">Date</label>
          <div class="control"><input class="input" type="date" v-model="game.date" /></div>
        </div>
        <div class="field">
          <label class="label">Home Score</label>
          <div class="control"><input class="input" type="number" v-model.number="game.home" /></div>
        </div>
        <div class="field">
          <label class="label">Away Score</label>
          <div class="control"><input class="input" type="number" v-model.number="game.away" /></div>
        </div>

        <div class="field">
          <label class="label">Players (select to include)</label>
          <ul class="player-select">
            <li v-for="p in teamAthletes" :key="p.id" class="player-select-item">
              <label class="checkbox">
                <input type="checkbox" v-model="selectedIds" :value="p.id" /> {{ p.name }}
              </label>
              <div v-if="selectedIds.includes(p.id)" class="player-stats">
                <div v-for="s in statKeysToShow" :key="s" class="field small">
                  <label class="label small">{{ statLabels[s] }}</label>
                  <div class="control"><input class="input" type="number" v-model.number="playerStats[p.id][s]" /></div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <div class="actions">
          <button class="button" @click="saveGame">Save Game</button>
          <button class="button" @click="$router.back()">Cancel</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { doc, getDoc, collection, getDocs, query, orderBy, setDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db, auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'GameInfo',
  data(){
    return {
      loading: true,
      team: null,
      game: { opponent:'', date:null, home:0, away:0, id:null },
      teamAthletes: [],
      selectedIds: [],
      playerStats: {},
      statKeysToShow: [],
      statLabels: {
        points: 'Points', rebounds: 'Rebounds', assists: 'Assists', turnovers: 'Turnovers',
        fga: 'Field Goal Attempts', fgm: 'Field Goals Made', two_pa: '2-Point Attempts', two_pm: '2-Points Made',
        three_pa: '3-Point Attempts', three_pm: '3-Points Made', fouls: 'Fouls'
      }
    }
  },
  async mounted(){
    await this.load()
  },
  methods:{
    async load(){
      this.loading = true
      const gameId = this.$route && this.$route.params && this.$route.params.gameId
      const teamId = this.$route && this.$route.query && this.$route.query.teamId
      if(!gameId || !teamId){ alert('Missing game or team id'); this.loading=false; return }
      try{
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){ uid = await new Promise(resolve=>{ const unsub = onAuthStateChanged(auth,(u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid){ alert('Must be signed in'); this.loading=false; return }

        const teamRef = doc(db, 'users', String(uid), 'Teams', String(teamId))
        const teamSnap = await getDoc(teamRef)
        if(teamSnap.exists()) this.team = { id: teamSnap.id, ...teamSnap.data() }

        const gameRef = doc(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(gameId))
        const gameSnap = await getDoc(gameRef)
        if(gameSnap.exists()) this.game = { id: gameSnap.id, ...gameSnap.data() }

        // determine which stat keys to show from team booleans
        const possibleKeys = Object.keys(this.statLabels)
        this.statKeysToShow = possibleKeys.filter(k => this.team && this.team[k])

        // load team athletes (per-user)
        const athletesCol = collection(db, 'users', String(uid), 'athletes')
        const snap = await getDocs(query(athletesCol, orderBy('name')))
        const list = snap.docs.map(d=>({ id: d.id, ...d.data() }))
        // filter to those on this team by checking team refs
        this.teamAthletes = list.filter(a => {
          if(!a.team || !Array.isArray(a.team)) return false
          return a.team.some(t => (t && (t.id && String(t.id)===String(teamId)) || (t.path && t.path.endsWith(`/Teams/${teamId}`)) || (typeof t==='string' && t===String(teamId))))
        })

        // initialize playerStats map
        for(const p of this.teamAthletes){
          this.playerStats[p.id] = {}
          for(const k of this.statKeysToShow) this.playerStats[p.id][k] = 0
        }

        // load existing player stats for this game (if any)
        const playersCol = collection(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(gameId), 'players')
        const pSnap = await getDocs(playersCol)
        if(pSnap && !pSnap.empty){
          pSnap.docs.forEach(d=>{
            const data = d.data()
            const aid = d.id
            if(!this.playerStats[aid]){
              this.playerStats[aid] = {}
              for(const k of this.statKeysToShow) this.playerStats[aid][k] = 0
            }
            for(const k of this.statKeysToShow) this.playerStats[aid][k] = data[k] || 0
            if(!this.selectedIds.includes(aid)) this.selectedIds.push(aid)
          })
        }

      }catch(err){ console.error('Failed loading game info', err); alert('Failed to load: '+(err&&err.message)) }
      finally{ this.loading = false }
    },
    async saveGame(){
      try{
        const gameId = this.$route.params.gameId
        const teamId = this.$route.query.teamId
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){ uid = await new Promise(resolve=>{ const unsub = onAuthStateChanged(auth,(u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid) return alert('Must be signed in')

        const gameRef = doc(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(gameId))
        const payload = { opponent: (this.game.opponent||'').trim(), date: this.game.date || null, home: Number(this.game.home||0), away: Number(this.game.away||0) }
        await updateDoc(gameRef, payload)

        // write per-athlete stats under games/{gameId}/players/{athleteId}
        for(const aid of this.selectedIds){
          const stats = this.playerStats[aid] || {}
          const playerDocRef = doc(db, 'users', String(uid), 'Teams', String(teamId), 'games', String(gameId), 'players', String(aid))
          await setDoc(playerDocRef, Object.assign({ athleteId: aid }, stats), { merge: true })
          // add game reference to athlete document
          const athleteRef = doc(db, 'users', String(uid), 'athletes', String(aid))
          await updateDoc(athleteRef, { games: arrayUnion(gameRef) })
        }

        alert('Game saved')
        this.$router.push({ name: 'TeamGames', params: { id: String(teamId) } })
      }catch(err){ console.error('Failed to save game info', err); alert('Save failed: '+(err&&err.message)) }
    }
  }
}
</script>

<style scoped>
.player-select{list-style:none;padding:0;margin:8px 0}
.player-select-item{padding:8px;border-bottom:1px solid #eee}
.player-stats{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.field.small{width:120px}
.actions{margin-top:16px}

/* Light-gray inputs and black labels for readability */
.label{color:#000}
.label.small{color:#000}
.input{background:#f3f4f6;border:1px solid #d1d5db;color:#000}
.input::placeholder{color:#6b7280}
</style>
