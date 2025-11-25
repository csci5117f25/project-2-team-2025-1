<template>
  <div class="container">
    <!-- Header Navigation -->
    <header class="header">
      <button class="tab active">TEAMS</button>
      <button class="tab">SEASONS</button>
      <button class="tab">SETTINGS</button>
    </header>
    <!-- Main Content -->
    <main class="main-content">
      <h1 class="team-title">ROSEVILLE BASKETBALL TEAM 2025-26</h1>
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
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn btn-new-game">NEW GAME</button>
        <button class="btn btn-edit-team">EDIT TEAM</button>
        <button class="btn btn-add-player" @click="showAddModal = true">ADD PLAYER</button>
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
              <label class="label">Name</label>
              <div class="control">
                <input class="input" type="text" placeholder="Player name" v-model="newPlayer.name" />
              </div>
            </div>

            <div class="field">
              <label class="label">Photo</label>
              <div class="control">
                <input type="file" accept="image/*" @change="onFileChange" />
              </div>
              <div v-if="newPlayer.photo" class="image is-64x64" style="margin-top:8px">
                <img :src="newPlayer.photo" alt="preview" />
              </div>
            </div>
          </section>
          <footer class="modal-card-foot">
            <button class="button is-success" @click="addPlayer">Add Player</button>
            <button class="button" @click="closeModal">Cancel</button>
          </footer>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'TeamPage',
  data() {
    return {
      players: [
        { id: 1, name: 'PLAYER' },
        { id: 2, name: 'PLAYER 2' },
        { id: 3, name: 'PLAYER 3' },
        { id: 4, name: 'REESE' },
        { id: 5, name: 'JACK H.' }
      ]
      ,
      showAddModal: false,
      newPlayer: {
        name: '',
        photo: null,
        file: null
      }
      ,
      createdUrls: []
    }
  }
  ,
  methods: {
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
      try{
        if(this.newPlayer.file){
          const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')
          const { storage, db } = await import('../firebase.js')
          const ext = (this.newPlayer.file.name || '').split('.').pop() || 'jpg'
          const path = `players/${id}/avatar.${ext}`
          const r = storageRef(storage, path)
          await uploadBytes(r, this.newPlayer.file)
          photoUrl = await getDownloadURL(r)

          const { doc, setDoc, collection } = await import('firebase/firestore')
          const docRef = doc(collection(db, 'players'), String(id))
          await setDoc(docRef, {
            id: String(id),
            name,
            photo: photoUrl,
            createdAt: new Date().toISOString()
          })
        }
      }catch(err){
        console.error('Add player upload failed', err)
        alert('Failed to upload player photo: ' + (err && err.message))
      }

      this.players.unshift({ id: String(id), name, photo: photoUrl })
      this.closeModal()
    }
  },
}
</script>

<style scoped>
.player-photo{width:40px;height:40px;object-fit:cover;border-radius:50%;border:2px solid #fff}
.btn-add-player{border-color:#ff6b6b;color:#ff6b6b}
.btn-add-player:hover{background:#ff6b6b;color:#fff}
</style>
