<template>
  <aside class="sidebar">
    <div class="header-row">
      <h3 class="brand">Active Teams</h3>
      <button class="btn-add" @click="showAdd = true">+ Add Team</button>
    </div>

    <div v-if="!currentUser">Please sign in to view teams</div>
    <div v-else-if="teamsLoading">Loading teams...</div>
    <div v-else-if="teams && teams.length === 0" class="muted">No teams</div>
    <ul v-else class="team-list">
      <li v-for="t in teams" :key="t.id" class="team-item">
        <button class="team-btn" @click="selectTeam(t)">
          {{ getName(t) }}
        </button>
      </li>
    </ul>

    <div class="modal" v-if="showAdd">
      <div class="modal-card team-modal-card">
        <header class="modal-header">Create Team</header>
          <div class="modal-body">
            <div class="field">
              <div class="label">Team name</div>
              <div class="control"><input class="input" v-model="newName" placeholder="Team name" /></div>
            </div>

            <div class="field">
              <div class="label">Season (format: 2025-2026)</div>
              <div class="control"><input class="input" v-model="season" placeholder="YYYY-YYYY" /></div>
            </div>

            <div class="field">
              <div class="control"><label class="checkbox"><input type="checkbox" v-model="active" /> Active</label></div>
            </div>

            <div class="field">
              <div class="label">Statistics</div>
              <div class="control stats-grid">
                <label class="checkbox" v-for="s in statsList" :key="s.key">
                  <input type="checkbox" v-model="stats[s.key]" /> {{ s.label }}
                </label>
              </div>
            </div>
          </div>
        <div class="modal-actions">
          <button @click="onCreate">Create</button>
          <button @click="closeAdd">Cancel</button>
        </div>
      </div>
    </div>
    <div class="account-area">
      <template v-if="currentUser">
        <div class="account">{{ currentUser.displayName || currentUser.email }}</div>
        <button class="btn-logout" @click="logout">Log out</button>
      </template>
      <template v-else>
        <button class="btn-login" @click="login">Sign in</button>
      </template>
    </div>
  </aside>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { collection, query, orderBy, addDoc, getDocs, where } from 'firebase/firestore'
import { db, auth } from '../firebase.js'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'vue-router'

const router = useRouter()

onMounted(()=>{
  // loads are triggered when auth state is known
})

// reactive auth + teams list (filtered by uid)
const currentUser = ref(null)
const teams = ref([])
const teamsLoading = ref(false)
const athletes = ref([])
const athletesLoading = ref(false)

function clearTeams(){ teams.value = [] }

async function loadTeamsForUid(uid){
  teamsLoading.value = true
  try{
    const colRef = collection(db, 'users', String(uid), 'Teams')
    const q = query(colRef, orderBy('name'))
    const snap = await getDocs(q)
    teams.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }catch(err){
    console.error('Failed to load teams for uid', err)
    teams.value = []
  }finally{ teamsLoading.value = false }
}

async function loadAthletesForUid(uid){
  athletesLoading.value = true
  try{
    const colRef = collection(db, 'users', String(uid), 'athletes')
    const snap = await getDocs(colRef)
    athletes.value = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  }catch(err){
    console.error('Failed to load athletes for uid', err)
    athletes.value = []
  }finally{ athletesLoading.value = false }
}

onAuthStateChanged(auth, (u)=>{
  currentUser.value = u
  if(u && u.uid){
    loadTeamsForUid(u.uid)
    loadAthletesForUid(u.uid)
  } else {
    clearTeams()
    athletes.value = []
  }
})

const showAdd = ref(false)
const newName = ref('')
const season = ref('')
const active = ref(true)

// statistics keys and labels
const statsList = [
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
]

import { reactive } from 'vue'
const stats = reactive({})
// initialize defaults (false)
for(const s of statsList) stats[s.key] = false

function selectTeam(team) {
  const id = team && (team.id || (typeof team.data === 'function' && team.data().id))
  if (!id) return
  router.push({ name: 'Team', params: { id: String(id) } }).catch(()=>{})
}

async function login(){
  try{
    const provider = new GoogleAuthProvider()
    const res = await signInWithPopup(auth, provider)
    const u = res.user
    if(u){
      // ensure user doc exists
      await import('firebase/firestore').then(async ({ doc, setDoc }) => {
        await setDoc(doc(db,'users', u.uid), { uid: u.uid, displayName: u.displayName, email: u.email }, { merge: true })
      })
      // load teams
      await loadTeamsForUid(u.uid)
    }
  }catch(err){
    console.error('Login failed', err)
    alert('Login failed: '+(err && err.message))
  }
}

async function logout(){
  try{ await signOut(auth); clearTeams(); router.push({ name: 'Login' }) }catch(err){ console.error('Logout failed', err); alert('Logout failed') }
}

const getName = (team) => {
  const data = typeof team.data === 'function' ? team.data() : team
  const name = (data && data.name) || 'Unknown'
  const seasonVal = (data && data.season) || ''
  return seasonVal ? `${name} (${seasonVal})` : name
}

function closeAdd(){
  showAdd.value = false
  newName.value = ''
  season.value = ''
  active.value = true
  for(const k of Object.keys(stats)) stats[k] = false
}

async function onCreate(){
  const name = (newName.value || '').trim()
  const s = (season.value || '').trim()
  const activeVal = !!active.value
  if(!name){ alert('Please enter a team name'); return }
  if(!/^[0-9]{4}-[0-9]{4}$/.test(s)){ alert('Season must be in format YYYY-YYYY'); return }
  try{
    // include stats booleans in the document
    const docData = { name, season: s, active: activeVal, createdAt: new Date().toISOString() }
    // note: teams are stored under the user's document; do not add uid field here
    for(const k of Object.keys(stats)) docData[k] = !!stats[k]
    // store team inside the user's subcollection if signed in
    if(currentUser && currentUser.value && currentUser.value.uid){
      await addDoc(collection(db,'users', String(currentUser.value.uid), 'Teams'), docData)
      await loadTeamsForUid(currentUser.value.uid)
    } else {
      await addDoc(collection(db,'Teams'), docData)
    }
    closeAdd()
  }catch(err){
    console.error('Create team failed', err)
    alert('Failed to create team: '+(err && err.message))
  }
}
</script>

<style scoped>
.sidebar{padding:12px;background:#1f2937;color:#fff;min-height:100vh;width:240px;box-sizing:border-box}
.header-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.btn-add{background:transparent;border:1px solid rgba(255,255,255,0.06);color:#fff;padding:6px 8px;border-radius:6px;cursor:pointer}
.btn-add:hover{background:rgba(255,255,255,0.02)}
.brand{margin:0 0 10px 0;font-weight:600}
.team-list{list-style:none;padding:0;margin:0}
.team-item{margin:6px 0}
.team-btn{width:100%;text-align:left;background:transparent;border:none;color:inherit;padding:8px;border-radius:6px;cursor:pointer}
.team-btn:hover{background:rgba(255,255,255,0.03)}
.muted{color:#9ca3af}
.modal{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);z-index:40}
.team-modal-card{background:#0b0b0b;color:#d1d5db;width:420px;border-radius:8px;padding:14px}
.team-modal-card .modal-header{font-weight:700;margin-bottom:8px;color:#d1d5db}
.team-modal-card .modal-body .field{margin:8px 0}
.team-modal-card .modal-body .input{width:100%;padding:8px;border:1px solid #333;border-radius:6px;background:#0f0f0f;color:#d1d5db}
.team-modal-card .modal-body input{width:100%;padding:8px;border:1px solid #333;border-radius:6px;background:#0f0f0f;color:#d1d5db}
.team-modal-card .modal-body .label{color:#d1d5db;margin-bottom:6px}
.team-modal-card .modal-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:12px}
.team-modal-card .modal-actions button{position:relative;background:#111;border:1px solid #2a2a2a;color:#d1d5db;padding:8px 12px;border-radius:6px;cursor:pointer}
.team-modal-card .modal-actions button:hover{background:#1a1a1a;color:#fff}
.team-modal-card .modal-actions button::before{content:'';width:10px;height:10px;background:#0f0f0f;border:1px solid #2a2a2a;display:block;position:absolute;left:50%;transform:translateX(-50%);top:-12px;border-radius:2px}
.team-modal-card .checkbox{display:flex;align-items:center;gap:10px;color:#d1d5db;margin:0}
.team-modal-card .control{display:flex;align-items:center;justify-content:flex-start}
.team-modal-card .stats-grid{display:block}
.team-modal-card .stats-grid .checkbox{display:flex;align-items:center;gap:10px}
.team-modal-card .stats-grid .checkbox input{width:18px;height:18px}
@media (max-width:700px){.sidebar{width:72px;padding:8px}.brand{display:none}.team-btn{font-size:0.9rem}}
</style>
