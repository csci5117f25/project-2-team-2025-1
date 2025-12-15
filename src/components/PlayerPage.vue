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
            <p class="subtitle is-6">CLASS OF 2027 &nbsp; <strong>#{{ player.number }}</strong></p>
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
        <div class="notification is-light has-text-centered">
          <strong>No stats available</strong>
          <p>Statistics will appear here once data is added for this player.</p>
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
      createdUrls: []
    }
  },
  methods: {
    setTab(tab){
      this.activeTab = tab
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
  },
  computed: {
    player() {
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
</style>
