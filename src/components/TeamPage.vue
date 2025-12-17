<template>
  <div class="container">
    <!-- Header Navigation -->
    <header class="header">
      <router-link to="/" class="tab active">TEAMS</router-link>
      <button class="tab">SEASONS</button>
      <button class="tab">SETTINGS</button>
    </header>

    <!-- Main Content -->
    <main class="main-content">
      <div class="level">
        <div class="level-left">
          <div class="level-item">
            <router-link to="/" class="button is-text">
              <span class="icon">←</span>
              <span>Back to Teams</span>
            </router-link>
          </div>
        </div>
      </div>
      <h1 class="team-title">{{ teamName }}</h1>

      <!-- Athletes Section -->
      <div class="section">
        <h2 class="section-title">ATHLETES</h2>

        <div class="player-list" v-if="players.length > 0">
          <div class="player-item-wrapper" v-for="player in players" :key="player.id">
            <router-link
              class="player-item"
              :to="{ name: 'Player', params: { teamId: $route.params.teamId, id: player.id } }"
            >
              <div class="player-icon">
                <img v-if="player.photo" :src="player.photo" alt="player" class="player-photo" />
                <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="8" r="4"/>
                  <path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
                </svg>
              </div>
              <span class="player-name">{{ player.name }}</span>
            </router-link>
            <button class="button is-small is-danger delete-player-btn" @click="deletePlayer(player.id)">Delete</button>
          </div>
        </div>
        <div v-else class="notification is-light has-text-centered">
          No players yet. Click "ADD PLAYER" below.
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="action-buttons">
        <!-- <button class="btn btn-new-game">NEW GAME</button> -->
        <button class="btn btn-add-player" @click="showModal = true">ADD PLAYER</button>
      </div>

      <!-- Add Player Modal -->
      <div class="modal" :class="{ 'is-active': showModal }">
        <div class="modal-background" @click="showModal = false"></div>
        <div class="modal-card">
          <header class="modal-card-head">
            <p class="modal-card-title">Add Player</p>
            <button class="delete" @click="showModal = false"></button>
          </header>
          <section class="modal-card-body">
            <div class="field">
              <label class="label">Name</label>
              <div class="control">
                <input class="input" v-model="newPlayerName" placeholder="Player name" />
              </div>
            </div>
            <div class="field">
              <label class="label">Photo (optional)</label>
              <div class="control">
                <input type="file" accept="image/*" @change="onFileChange" />
              </div>
              <div v-if="newPlayer.photoPreview" class="mt-2">
                <img :src="newPlayer.photoPreview" alt="preview" style="width:100px;height:100px;object-fit:cover;border-radius:50%;" />
              </div>
            </div>
          </section>
          <footer class="modal-card-foot">
            <button class="button is-success" @click="addPlayer">Add</button>
            <button class="button" @click="showModal = false">Cancel</button>
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { useCollection, useDocument, useFirestore } from 'vuefire'
import { collection, doc, setDoc, deleteDoc, query, where } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { computed } from 'vue'
import { storage } from '../firebase.js'

export default {
  name: 'TeamPage',
  props: ['teamId'],
  setup(props) {
    const db = useFirestore()
    const team = useDocument(doc(db, 'teams', props.teamId))
    const players = useCollection(query(collection(db, 'players'), where('teamId', '==', props.teamId)))
    const teamName = computed(() => team.value?.name || '')

    return { team, players, teamName }
  },
  data() {
    return {
      showModal: false,
      newPlayerName: '',
      newPlayer: {
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
      this.newPlayer.file = file
      if (this.newPlayer.photoPreview && this.createdUrls.includes(this.newPlayer.photoPreview)) {
        URL.revokeObjectURL(this.newPlayer.photoPreview)
        this.createdUrls = this.createdUrls.filter(u => u !== this.newPlayer.photoPreview)
      }
      const url = URL.createObjectURL(file)
      this.newPlayer.photoPreview = url
      this.createdUrls.push(url)
    },
    async addPlayer() {
      if (!this.newPlayerName) {
        alert('Please enter a name')
        return
      }

      try {
        const db = useFirestore()
        const playerId = Date.now().toString()
        let photoUrl = null

        if (this.newPlayer.file) {
          try {
            const ext = this.newPlayer.file.name.split('.').pop() || 'jpg'
            const path = `players/${playerId}/photo.${ext}`
            const fileRef = storageRef(storage, path)
            await uploadBytes(fileRef, this.newPlayer.file)
            photoUrl = await getDownloadURL(fileRef)
          } catch (uploadError) {
            alert('Photo upload failed: ' + uploadError.message)
          }
        }

        const playerRef = doc(db, 'players', playerId)
        await setDoc(playerRef, {
          id: playerId,
          teamId: this.teamId,
          name: this.newPlayerName,
          photo: photoUrl,
          number: '',
          createdAt: new Date().toISOString()
        })

        if (this.newPlayer.photoPreview && this.createdUrls.includes(this.newPlayer.photoPreview)) {
          URL.revokeObjectURL(this.newPlayer.photoPreview)
          this.createdUrls = this.createdUrls.filter(u => u !== this.newPlayer.photoPreview)
        }
        this.newPlayerName = ''
        this.newPlayer = { photoPreview: null, file: null }
        this.showModal = false
      } catch (err) {
        alert('Failed to add player: ' + err.message)
      }
    },
    async deletePlayer(playerId) {
      if (!confirm('Are you sure you want to delete this player?')) return

      try {
        const db = useFirestore()
        await deleteDoc(doc(db, 'players', playerId))
      } catch (err) {
        alert('Failed to delete player: ' + err.message)
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
.player-item-wrapper {
  display: flex;
  align-items: stretch;
  background: #E5E5E5;
  border-bottom: 3px solid #fff;
}

.player-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  flex: 1;
  cursor: pointer;
  transition: background-color 0.2s;
  text-decoration: none;
  color: inherit;
}

.player-item:hover {
  background: #d5d5d5;
}

.delete-player-btn {
  margin: 10px;
  align-self: center;
}

.player-photo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 50%;
}

.btn-add-player {
  border-color: #ff6b6b;
  color: #ff6b6b;
}

.btn-add-player:hover {
  background: #ff6b6b;
  color: #fff;
}
</style>
