<template>
  <div class="modal" :class="{ 'is-active': show }">
    <div class="modal-background" @click="close"></div>
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{{ videoType === 'highlight' ? 'Add Highlight' : 'Add Game' }}</p>
        <button class="delete" aria-label="close" @click="close"></button>
      </header>
      <section class="modal-card-body">
        <div class="tabs is-toggle is-fullwidth">
          <ul>
            <li :class="{ 'is-active': activeTab === 'upload' }"><a @click.prevent="activeTab='upload'">Upload</a></li>
            <li :class="{ 'is-active': activeTab === 'record' }"><a @click.prevent="activeTab='record'">Record</a></li>
          </ul>
        </div>

        <div v-if="activeTab === 'upload'">
          <div class="field">
            <label class="label">Title</label>
            <div class="control"><input class="input" v-model="form.title" placeholder="Video title" /></div>
          </div>
          <div class="field">
            <label class="label">Video file</label>
            <div class="control">
              <input type="file" accept="video/*" @change="onFileChange" />
            </div>
          </div>
          <div v-if="form.previewUrl" class="box">
            <video :src="form.previewUrl" controls style="width:100%;max-height:320px;object-fit:cover"></video>
          </div>
        </div>

        <div v-if="activeTab === 'record'">
          <div class="field">
            <label class="label">Title</label>
            <div class="control"><input class="input" v-model="form.title" placeholder="Video title" /></div>
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
          <div v-if="form.previewUrl" class="box">
            <p class="subtitle is-6">Recorded preview</p>
            <video :src="form.previewUrl" controls style="width:100%;max-height:320px;object-fit:cover"></video>
          </div>
        </div>
      </section>
      <footer class="modal-card-foot">
        <button class="button is-success" @click="submit" :disabled="uploading">
          {{ uploading ? 'Uploading...' : 'Save' }}
        </button>
        <button class="button" @click="close" :disabled="uploading">Cancel</button>
      </footer>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AddVideoModal',
  props: {
    show: Boolean,
    videoType: String,
    playerId: String
  },
  emits: ['close', 'saved'],
  data() {
    return {
      activeTab: 'upload',
      form: {
        title: '',
        file: null,
        previewUrl: null
      },
      recording: false,
      uploading: false,
      mediaStream: null,
      mediaRecorder: null,
      recordedChunks: [],
      createdUrls: []
    }
  },
  methods: {
    close() {
      if (this.mediaRecorder && this.recording) {
        this.mediaRecorder.stop()
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop())
        this.mediaStream = null
      }
      if (this.form.previewUrl && this.createdUrls.includes(this.form.previewUrl)) {
        URL.revokeObjectURL(this.form.previewUrl)
        this.createdUrls = this.createdUrls.filter(u => u !== this.form.previewUrl)
      }
      this.form = { title: '', file: null, previewUrl: null }
      this.recording = false
      this.activeTab = 'upload'
      this.$emit('close')
    },
    onFileChange(e) {
      const file = e.target.files?.[0]
      if (!file) return
      this.form.file = file
      if (this.form.previewUrl && this.createdUrls.includes(this.form.previewUrl)) {
        URL.revokeObjectURL(this.form.previewUrl)
        this.createdUrls = this.createdUrls.filter(u => u !== this.form.previewUrl)
      }
      const url = URL.createObjectURL(file)
      this.form.previewUrl = url
      this.createdUrls.push(url)
    },
    async submit() {
      if (this.uploading) return

      this.uploading = true
      const id = Date.now()
      const title = this.form.title || (this.videoType === 'highlight' ? 'Highlight' : 'Game')
      const date = new Date().toLocaleDateString()
      const collectionName = this.videoType === 'highlight' ? 'highlights' : 'games'

      try {
        if (this.form.file) {
          const { ref: storageRef, uploadBytes, getDownloadURL } = await import('firebase/storage')
          const { storage, db } = await import('../firebase.js')
          const path = `players/${this.playerId || 'unknown'}/${collectionName}/${id}`
          const r = storageRef(storage, path)
          await uploadBytes(r, this.form.file)
          const finalUrl = await getDownloadURL(r)

          const { doc, setDoc, collection } = await import('firebase/firestore')
          const docRef = doc(collection(db, collectionName), String(id))
          await setDoc(docRef, {
            id: String(id),
            playerId: String(this.playerId || '1'),
            title,
            date,
            videoUrl: finalUrl,
            createdAt: new Date().toISOString()
          })
        }
      } catch (err) {
        alert('Upload failed: ' + (err && err.message))
      } finally {
        this.uploading = false
      }

      this.$emit('saved', this.videoType)
      this.close()
    },
    async startRecording() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        this.mediaStream = stream
        const videoEl = this.$refs.recPreview
        if (videoEl) {
          videoEl.srcObject = stream
        }
        this.recordedChunks = []
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' })
        this.mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size) this.recordedChunks.push(e.data) }
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.recordedChunks, { type: 'video/webm' })
          this.form.file = blob
          const url = URL.createObjectURL(blob)
          this.form.previewUrl = url
          this.createdUrls.push(url)
        }
        this.mediaRecorder.start()
        this.recording = true
      } catch (err) {
        alert('Unable to access camera: ' + (err && err.message))
      }
    },
    stopRecording() {
      if (this.mediaRecorder && this.recording) {
        this.mediaRecorder.stop()
      }
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop())
        this.mediaStream = null
      }
      this.recording = false
    }
  },
  beforeUnmount() {
    if (this.createdUrls.length) {
      this.createdUrls.forEach(u => {
        try { URL.revokeObjectURL(u) } catch (e) { }
      })
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(t => t.stop())
      this.mediaStream = null
    }
  }
}
</script>
