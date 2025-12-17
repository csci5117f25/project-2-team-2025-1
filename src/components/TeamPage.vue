<template>
  <div class="container">
    <!-- Main Content -->
    <main class="main-content">
      <h1 class="team-title">
        <span v-if="team">{{ team.name }}</span>
        <span v-if="team && team.season"> — {{ team.season }}</span>
        <span v-else-if="loading">Loading...</span>
      </h1>
      <!-- Top nav: Athletes / Games -->
      <nav class="team-nav">
        <router-link :to="{ name: 'Team', params: { id: team ? String(team.id) : $route.params.id } }" class="team-nav-item" :class="{ 'active-tab': $route.name === 'Team' }">Athletes</router-link>
        <router-link :to="{ name: 'TeamGames', params: { id: team ? String(team.id) : $route.params.id } }" class="team-nav-item" :class="{ 'active-tab': $route.name === 'TeamGames' }">Games</router-link>
      </nav>
      <!-- Athletes Section -->
      <div class="section">
        <h2 class="section-title">ATHLETES</h2>

        <div class="player-list">
          <router-link
            class="player-item"
            v-for="player in players"
            :key="player.id"
            :to="{ name: 'Player', params: { id: String(player.id) } }"
          >
            <div class="player-icon">
              <template v-if="player.photo">
                <img :src="player.photo" alt="player photo" class="player-photo" />
              </template>
              <template v-else>
                <span class="player-emoji" role="img" :aria-label="`Player avatar: ${player.name}`">🏀</span>
              </template>
            </div>
            <span class="player-name">{{ player.name }}</span>
          </router-link>
        </div>
      </div>

      <!-- New Game moved to TeamGames page -->
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn btn-edit-team" @click="openAddModal">EDIT TEAM</button>
        <button class="btn btn-add-player">ADD PLAYER</button>
      </div>

      <!-- Add Player Modal -->
      <div class="modal" :class="{ 'is-active': showAddModal }" v-if="showAddModal">
        <div class="modal-background" @click="closeModal"></div>
        <div class="modal-card">
          <header class="modal-card-head">
            <p class="modal-card-title">Add Player</p>
            <button class="delete" aria-label="close" @click="closeModal"></button>
          </header>
          <section class="modal-card-body">
            <div class="field">
              <label class="label">Search athletes by name</label>
              <div class="control">
                <input class="input" type="text" placeholder="Type a name..." v-model="searchText" />
              </div>
            </div>
                  <ul class="search-list">
                    <li v-for="a in allAthletes" :key="a.id" class="search-item">
                      <div class="search-info">
                        <div class="search-name">{{ a.name }}</div>
                        <div class="search-email">{{ a.email || '' }}</div>
                      </div>
                      <button v-if="!isOnTeam(a)" class="add-btn" @click.prevent="addExistingPlayer(a)">Add Player +</button>
                      <button v-else class="kick-btn" @click.prevent="removeExistingPlayer(a)">Kick Player</button>
                    </li>
                    <li v-if="allAthletes.length===0" class="muted">No matching athletes</li>
                  </ul>
          </section>
          <footer class="modal-card-foot">
            <button class="button" @click="closeModal">Close</button>
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove, orderBy, startAt, endAt, addDoc, serverTimestamp } from 'firebase/firestore'
import { db, auth } from '../firebase.js'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'TeamPage',
  data() {
    return {
      team: null,
      teamOwnerUid: null,
      players: [],
      loading: true,
      showAddModal: false,
      
      allAthletes: [],
      allAthletesCache: [],
      searchText: '',
      searchTimeout: null,
      createdUrls: [],
      newPlayer: { name: '', photo: null, file: null },
      
      newGame: {
        opponent: '',
        date: '',
        home: null,
        away: null
      }
    }
  },
  async mounted() {
    await this.loadTeamAndPlayers()
  },
  methods: {
    async loadTeamAndPlayers(){
      this.loading = true
      const teamId = this.$route && this.$route.params && this.$route.params.id
      if(!teamId){
        this.loading = false
        return
      }
      {
        
        let uid = auth && auth.currentUser && auth.currentUser.uid
        if(!uid){
          uid = await new Promise(resolve => {
            const unsub = onAuthStateChanged(auth, (u) => { unsub(); resolve(u?u.uid:null) })
          })
        }
        this.teamOwnerUid = uid
        const teamRef = uid ? doc(db, 'users', String(uid), 'Teams', String(teamId)) : doc(db, 'Teams', String(teamId))
        const teamSnap = await getDoc(teamRef)
        if(teamSnap.exists()){
          this.team = { id: teamSnap.id, ...teamSnap.data() }
        } else {
          this.team = { id: teamId, name: 'Unknown Team', season: '' }
        }

        
        {
          
          let uidForQuery = this.teamOwnerUid || (auth && auth.currentUser && auth.currentUser.uid)
          if(!uidForQuery){
            uidForQuery = await new Promise(resolve => { const unsub = onAuthStateChanged(auth, (u)=>{ unsub(); resolve(u?u.uid:null) }) })
          }
          if(!uidForQuery){
            
            this.players = []
          } else {
            const athletesCol = collection(db, 'users', String(uidForQuery), 'athletes')
            const q = query(athletesCol, where('team', 'array-contains', teamRef))
            const snap = await getDocs(q)
            this.players = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          }
        }
      }
      this.loading = false
    },

    onFileChange(e){
      const file = e.target.files && e.target.files[0]
      if(!file) return
      this.newPlayer.file = file
      if(this.newPlayer.photo && this.createdUrls.includes(this.newPlayer.photo)){
        URL.revokeObjectURL(this.newPlayer.photo)
        this.createdUrls = this.createdUrls.filter(u => u !== this.newPlayer.photo)
      }
      const url = URL.createObjectURL(file)
      this.newPlayer.photo = url
      this.createdUrls.push(url)
    },
    closeModal(){
      this.showAddModal = false
      if(this.newPlayer.photo && this.createdUrls.includes(this.newPlayer.photo)){
        URL.revokeObjectURL(this.newPlayer.photo)
        this.createdUrls = this.createdUrls.filter(u => u !== this.newPlayer.photo)
      }
      this.newPlayer = { name: '', photo: null, file: null }
    },
    async addPlayer(){
      const id = Date.now()
      const name = this.newPlayer.name || 'Player'
      let photoUrl = this.newPlayer.photo || null
      {
        if(this.newPlayer.file){
          const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')
          const { storage } = await import('../firebase.js')
          const ext = (this.newPlayer.file.name || '').split('.').pop() || 'jpg'
          const path = `players/${id}/avatar.${ext}`
          const r = storageRef(storage, path)
          await uploadBytes(r, this.newPlayer.file)
          photoUrl = await getDownloadURL(r)

          const { doc, setDoc, collection } = await import('firebase/firestore')
          // require authenticated user and write athlete into users/{uid}/athletes
          const uidForWrite = this.teamOwnerUid || (auth && auth.currentUser && auth.currentUser.uid)
          if(!uidForWrite) throw new Error('Must be signed in to create an athlete')
          const athletesColRef = collection(db, 'users', String(uidForWrite), 'athletes')
          const docRef = doc(athletesColRef, String(id))
          const teamRefForPlayer = doc(db, 'users', String(uidForWrite), 'Teams', this.team.id)
          await setDoc(docRef, {
            id: String(id),
            name,
            photo: photoUrl,
            createdAt: new Date().toISOString(),
            team: [ teamRefForPlayer ]
          })
        }
      }

      this.players.unshift({ id: String(id), name, photo: photoUrl })
      this.closeModal()
    },

    
    
    async openAddModal(){
      this.showAddModal = true
      this.searchText = ''
      
      let uid = this.teamOwnerUid || (auth && auth.currentUser && auth.currentUser.uid)
      if(!uid){
        uid = await new Promise(resolve => { const unsub = onAuthStateChanged(auth, (u)=>{ unsub(); resolve(u?u.uid:null) }) })
      }
      if(!this.allAthletesCache || this.allAthletesCache.length === 0){
        {
          if(uid){
            const snap = await getDocs(query(collection(db, 'users', String(uid), 'athletes'), orderBy('name')))
            if(snap && !snap.empty){
              this.allAthletesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }))
            } else {
              this.allAthletesCache = []
            }
          } else {
            this.allAthletesCache = []
          }
        }
      }
      
      this.allAthletes = this.allAthletesCache.slice()
    },

    
    async searchAthletes(prefix){
      const p = (prefix || '').trim().toLowerCase()
      // if empty, show all cached athletes
      if(!p){
        this.allAthletes = this.allAthletesCache.slice()
        return
      }
      // if cache available, filter client-side for substring matches
      if(this.allAthletesCache && this.allAthletesCache.length > 0){
        this.allAthletes = this.allAthletesCache.filter(a => (a.name || '').toLowerCase().includes(p))
        return
      }
      // fallback: fetch all athletes from server then filter (prefix queries cannot do substring)
      {
        // prefer per-user athletes; if no user, return empty
        let uid = this.teamOwnerUid || (auth && auth.currentUser && auth.currentUser.uid)
        if(!uid){
          uid = await new Promise(resolve => { const unsub = onAuthStateChanged(auth, (u)=>{ unsub(); resolve(u?u.uid:null) }) })
        }
        if(!uid){
          this.allAthletesCache = []
          this.allAthletes = []
          return
        }
        const col = collection(db, 'users', String(uid), 'athletes')
        const snap = await getDocs(col)
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        this.allAthletesCache = list
        this.allAthletes = list.filter(a => (a.name || '').toLowerCase().includes(p))
      }
    },

    
    async addExistingPlayer(athlete){
      if(!this.team) return alert('No team selected')
      {
        
        let uid = this.teamOwnerUid || (auth && auth.currentUser && auth.currentUser.uid)
        const athleteRef = doc(db, 'users', String(uid), 'athletes', athlete.id)
        const teamRef = doc(db, 'users', String(uid), 'Teams', this.team.id)
        await updateDoc(athleteRef, { team: arrayUnion(teamRef) })
        // update cache entry so UI reflects membership
        let cacheIdx = this.allAthletesCache.findIndex(a => a.id === athlete.id)
        if(cacheIdx === -1){
          // add a new entry to cache
          this.allAthletesCache.unshift(Object.assign({}, athlete, { team: [teamRef] }))
          cacheIdx = 0
        } else {
          const entry = this.allAthletesCache[cacheIdx]
          if(!entry.team) entry.team = []
          const exists = entry.team.some(t => {
            if(!t) return false
            if(typeof t === 'string') return String(t) === String(this.team.id)
            if(t.id) return String(t.id) === String(this.team.id)
            if(t.path) return t.path.endsWith(`/Teams/${this.team.id}`)
            return false
          })
          if(!exists) entry.team.push(teamRef)
        }

        // refresh displayed filtered list
        const q = (this.searchText || '').toLowerCase()
        this.allAthletes = this.allAthletesCache.filter(a => (a.name || '').toLowerCase().includes(q))

        // update players list (ensure team field present)
        const existingPlayer = this.players.find(p => p.id === athlete.id)
        if(!existingPlayer){
          const cached = this.allAthletesCache[cacheIdx]
          this.players.unshift(Object.assign({}, athlete, { team: cached && cached.team ? cached.team.slice() : [teamRef] }))
        } else {
          existingPlayer.team = existingPlayer.team || []
          if(!existingPlayer.team.find(t => (t && ((t.id && String(t.id)===String(this.team.id)) || (t.path && t.path.endsWith(`/Teams/${this.team.id}`)) || (typeof t === 'string' && t === String(this.team.id)))))){
            existingPlayer.team.push(teamRef)
          }
        }
      }
    }

    ,
    isOnTeam(athlete){
      if(!this.team) return false
      const teamId = String(this.team.id)
      const tarr = athlete && athlete.team
      if(!tarr || !Array.isArray(tarr)) return false
      for(const t of tarr){
        if(!t) continue
        if(typeof t === 'string' && t === teamId) return true
        if(t.id && String(t.id) === teamId) return true
        if(t.path && t.path.endsWith(`/Teams/${teamId}`)) return true
      }
      return false
    },

    async removeExistingPlayer(athlete){
      if(!this.team) return alert('No team selected')
      {
        // require per-user athlete document
        let uid = this.teamOwnerUid || (auth && auth.currentUser && auth.currentUser.uid)
        if(!uid){ uid = await new Promise(resolve => { const unsub = onAuthStateChanged(auth, (u)=>{ unsub(); resolve(u?u.uid:null) }) }) }
        if(!uid) return alert('Must be signed in to remove an athlete')
        const athleteRef = doc(db, 'users', String(uid), 'athletes', athlete.id)
        const teamRef = doc(db, 'users', String(uid), 'Teams', this.team.id)
        await updateDoc(athleteRef, { team: arrayRemove(teamRef) })
        // remove from visible team players list if present
        this.players = this.players.filter(p => p.id !== athlete.id)
        // update cache entry
        const idx = this.allAthletesCache.findIndex(a=>a.id===athlete.id)
        if(idx !== -1){
          const entry = this.allAthletesCache[idx]
          if(entry.team && Array.isArray(entry.team)){
            entry.team = entry.team.filter(t => {
              if(!t) return false
              if(typeof t === 'string') return String(t) !== String(this.team.id)
              if(t.id) return String(t.id) !== String(this.team.id)
              if(t.path) return !t.path.endsWith(`/Teams/${this.team.id}`)
              return true
            })
          }
          // refresh displayed list
          this.allAthletes = this.allAthletesCache.filter(a => (a.name || '').toLowerCase().includes((this.searchText||'').toLowerCase()))
        }
      }
    }
  },
  watch: {
    searchText: function(val){
      if(this.searchTimeout) clearTimeout(this.searchTimeout)
      const v = (val || '')
      this.searchTimeout = setTimeout(()=>{
        this.searchAthletes(v)
      }, 300)
    },
    '$route.params.id': async function(){
      await this.loadTeamAndPlayers()
    }
  }
}
</script>

<style scoped>
.player-photo{width:40px;height:40px;object-fit:cover;border-radius:50%;border:2px solid #fff}
.btn-add-player{border-color:#ff6b6b;color:#ff6b6b}
.btn-add-player:hover{background:#ff6b6b;color:#fff}

/* search dropdown styles */
.search-list{list-style:none;padding:0;margin:8px 0;max-height:220px;overflow:auto}
.search-item{display:flex;align-items:center;justify-content:space-between;padding:8px;border-bottom:1px solid #eee}
.search-info{display:flex;flex-direction:column}
.search-name{font-weight:600}
.search-email{color:#9ca3af;font-size:0.9rem}
.add-btn{cursor:pointer;background-color:#00bd7e;border:none;padding:8px 12px;color:#fff;border-radius:6px}
.add-btn:hover{background-color:#01995a}
.kick-btn{cursor:pointer;background-color:#ff6b6b;border:none;padding:8px 12px;color:#fff;border-radius:6px}
.kick-btn:hover{background-color:#e04e4e}

.add-game-btn{cursor:pointer;background-color:#10b981;border:none;padding:8px 14px;color:#fff;border-radius:8px;font-weight:700}
.add-game-btn:hover{background-color:#059669}

/* Dark team modal (match edit team/add player style with dark background) */
.team-modal-card{background:#0b0b0b;color:#fff}
.team-modal-card .modal-card-title{color:#fff}
.team-modal-card .label{color:#ddd}
.team-modal-card .input{background:#111;border-color:#222;color:#fff}
.team-modal-card .input::placeholder{color:#888}
.modal-background{background-color:rgba(0,0,0,0.75)}

/* Centered two-part nav (pill) */
.team-nav{display:flex;width:min(520px,90%);margin:16px auto;border-radius:10px;overflow:hidden;box-shadow:0 1px 0 rgba(16,185,129,0.08)}
.team-nav-item{flex:1;text-align:center;padding:10px 0;background:#f3f4f6;color:#111;font-weight:600;border:0}
.team-nav-item:hover{background:#e6f9ee}
.team-nav-item.active-tab{background:#10b981;color:#fff}

</style>
