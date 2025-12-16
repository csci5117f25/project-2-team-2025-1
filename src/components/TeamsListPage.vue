<template>
  <div class="container">
    <header class="header">
      <button class="tab active">TEAMS</button>
      <button class="tab">SEASONS</button>
      <button class="tab">SETTINGS</button>
    </header>

    <main class="main-content">
      <h1 class="team-title">MY TEAMS</h1>

      <div class="section">
        <h2 class="section-title">TEAMS</h2>

        <div class="team-list" v-if="teams.length > 0">
          <router-link
            class="team-item"
            v-for="team in teams"
            :key="team.id"
            :to="{ name: 'TeamPlayers', params: { teamId: team.id } }"
          >
            <div class="team-icon">
              <img v-if="team.photo" :src="team.photo" alt="team" class="team-photo" />
              <span v-else>🏀</span>
            </div>
            <span class="team-name">{{ team.name }}</span>
          </router-link>
        </div>
        <div v-else class="notification is-light has-text-centered">
          No teams yet. Click "ADD TEAM" below.
        </div>
      </div>

      <div class="action-buttons">
        <button class="btn btn-add-team" @click="showModal = true">ADD TEAM</button>
      </div>

      <!-- Add Team Modal -->
      <div class="modal" :class="{ 'is-active': showModal }">
        <div class="modal-background" @click="closeModal"></div>
        <div class="modal-card">
          <header class="modal-card-head">
            <p class="modal-card-title">Add Team</p>
            <button class="delete" @click="closeModal"></button>
          </header>
          <section class="modal-card-body">
            <div class="field">
              <label class="label">Team Name</label>
              <div class="control">
                <input class="input" v-model="newTeam.name" placeholder="Team name" />
              </div>
            </div>
            <div class="field">
              <label class="label">Photo (optional)</label>
              <div class="control">
                <input type="file" accept="image/*" @change="onFileChange" />
              </div>
              <div v-if="newTeam.photoPreview" class="mt-2">
                <img :src="newTeam.photoPreview" alt="preview" style="width:100px;height:100px;object-fit:cover;" />
              </div>
            </div>
          </section>
          <footer class="modal-card-foot">
            <button class="button is-success" @click="addTeam">Add</button>
            <button class="button" @click="closeModal">Cancel</button>
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase.js'

export default {
  name: 'TeamsListPage',
  data() {
    return {
      teams: [],
      showModal: false,
      newTeam: {
        name: '',
        photoPreview: null,
        file: null
      },
      createdUrls: []
    }
  },
  async mounted() {
    await this.loadTeams()
  },
  methods: {
    async loadTeams() {
      try {
        const teamsCol = collection(db, 'teams')
        const snapshot = await getDocs(teamsCol)
        this.teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (err) {
        console.error('Failed to load teams', err)
      }
    },
    onFileChange(e) {
      const file = e.target.files?.[0]
      if (!file) return

      this.newTeam.file = file
      if (this.newTeam.photoPreview && this.createdUrls.includes(this.newTeam.photoPreview)) {
        URL.revokeObjectURL(this.newTeam.photoPreview)
        this.createdUrls = this.createdUrls.filter(u => u !== this.newTeam.photoPreview)
      }

      const url = URL.createObjectURL(file)
      this.newTeam.photoPreview = url
      this.createdUrls.push(url)
    },
    closeModal() {
      this.showModal = false
      if (this.newTeam.photoPreview && this.createdUrls.includes(this.newTeam.photoPreview)) {
        URL.revokeObjectURL(this.newTeam.photoPreview)
        this.createdUrls = this.createdUrls.filter(u => u !== this.newTeam.photoPreview)
      }
      this.newTeam = { name: '', photoPreview: null, file: null }
    },
    async addTeam() {
      if (!this.newTeam.name) {
        alert('Please enter a team name')
        return
      }

      try {
        const teamId = Date.now().toString()
        let photoUrl = null

        if (this.newTeam.file) {
          try {
            console.log('Uploading photo...', this.newTeam.file)
            const ext = this.newTeam.file.name.split('.').pop() || 'jpg'
            const path = `teams/${teamId}/photo.${ext}`
            console.log('Upload path:', path)
            const fileRef = storageRef(storage, path)
            console.log('Starting upload...')
            const uploadResult = await uploadBytes(fileRef, this.newTeam.file)
            console.log('Upload complete!', uploadResult)
            photoUrl = await getDownloadURL(fileRef)
            console.log('Photo URL:', photoUrl)
          } catch (uploadError) {
            console.error('Photo upload failed:', uploadError)
            alert('Photo upload failed: ' + uploadError.message)
            // Continue without photo
          }
        }

        console.log('Creating team in Firestore...', { id: teamId, name: this.newTeam.name, photo: photoUrl })
        const teamRef = doc(db, 'teams', teamId)
        await setDoc(teamRef, {
          id: teamId,
          name: this.newTeam.name,
          photo: photoUrl,
          createdAt: new Date().toISOString()
        })
        console.log('Team created successfully')

        this.teams.push({
          id: teamId,
          name: this.newTeam.name,
          photo: photoUrl
        })

        this.closeModal()
      } catch (err) {
        console.error('Failed to add team', err)
        alert('Failed to add team: ' + err.message)
      }
    }
  },
  beforeUnmount() {
    if (this.createdUrls.length) {
      this.createdUrls.forEach(u => {
        try { URL.revokeObjectURL(u) } catch(e) {}
      })
    }
  }
}
</script>

<style scoped>
.team-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #E5E5E5;
  border-bottom: 3px solid #fff;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  color: inherit;
}

.team-item:hover {
  background: #d5d5d5;
}

.team-photo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.btn-add-team {
  border-color: #4A90E2;
  color: #4A90E2;
}

.btn-add-team:hover {
  background: #4A90E2;
  color: #fff;
}
</style>
