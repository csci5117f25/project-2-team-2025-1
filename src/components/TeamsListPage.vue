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
          <div class="team-item-wrapper" v-for="team in teams" :key="team.id">
            <router-link
              class="team-item"
              :to="{ name: 'TeamPlayers', params: { teamId: team.id } }"
            >
              <div class="team-icon">
                <img v-if="team.photo" :src="team.photo" alt="team" class="team-photo" />
                <span v-else>🏀</span>
              </div>
              <span class="team-name">{{ team.name }}</span>
            </router-link>
            <button class="button is-small is-danger delete-team-btn" @click="deleteTeam(team.id)">Delete</button>
          </div>
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
import { useCollection, useFirestore } from 'vuefire'
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase.js'

export default {
  name: 'TeamsListPage',
  setup() {
    const db = useFirestore()
    const teams = useCollection(collection(db, 'teams'))
    return { teams }
  },
  data() {
    return {
      showModal: false,
      newTeam: {
        name: '',
        photoPreview: null,
        file: null
      },
      createdUrls: []
    }
  },
  methods: {
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
        const db = useFirestore()
        const teamId = Date.now().toString()
        let photoUrl = null

        if (this.newTeam.file) {
          try {
            const ext = this.newTeam.file.name.split('.').pop() || 'jpg'
            const path = `teams/${teamId}/photo.${ext}`
            const fileRef = storageRef(storage, path)
            await uploadBytes(fileRef, this.newTeam.file)
            photoUrl = await getDownloadURL(fileRef)
          } catch (uploadError) {
            alert('Photo upload failed: ' + uploadError.message)
          }
        }

        const teamRef = doc(db, 'teams', teamId)
        await setDoc(teamRef, {
          id: teamId,
          name: this.newTeam.name,
          photo: photoUrl,
          createdAt: new Date().toISOString()
        })

        this.closeModal()
      } catch (err) {
        alert('Failed to add team: ' + err.message)
      }
    },
    async deleteTeam(teamId) {
      if (!confirm('Are you sure you want to delete this team?')) return

      try {
        const db = useFirestore()
        await deleteDoc(doc(db, 'teams', teamId))
      } catch (err) {
        alert('Failed to delete team: ' + err.message)
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
.team-item-wrapper {
  display: flex;
  align-items: center;
  background: #E5E5E5;
  border-bottom: 3px solid #fff;
  padding-right: 10px;
}

.team-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  flex: 1;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  color: inherit;
}

.team-item:hover {
  background: #d5d5d5;
}

.delete-team-btn {
  margin-left: auto;
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
