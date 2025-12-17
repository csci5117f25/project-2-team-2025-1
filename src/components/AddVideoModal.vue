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
        <div style="width: 100%;">
          <div v-if="uploading" class="mb-3">
            <progress class="progress is-primary" :value="uploadProgress" max="100">{{ uploadProgress }}%</progress>
            <p class="has-text-centered">{{ uploadProgress }}%</p>
          </div>
          <div class="buttons">
            <button class="button is-success" @click="submit" :disabled="uploading">
              {{ uploading ? 'Uploading...' : 'Save' }}
            </button>
            <button class="button" @click="close" :disabled="uploading">Cancel</button>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onBeforeUnmount } from 'vue'
import { useFirestore } from 'vuefire'
import { doc, setDoc, collection } from 'firebase/firestore'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../firebase.js'

const props = defineProps({
  show: Boolean,
  videoType: String,
  playerId: String
})

const emit = defineEmits(['close', 'saved'])

const db = useFirestore()
const activeTab = ref('upload')
const form = ref({
  title: '',
  file: null,
  previewUrl: null
})
const recording = ref(false)
const uploading = ref(false)
const uploadProgress = ref(0)
const mediaStream = ref(null)
const mediaRecorder = ref(null)
const recordedChunks = ref([])
const createdUrls = ref([])
const recPreview = ref(null)

const close = () => {
  if (mediaRecorder.value && recording.value) {
    mediaRecorder.value.stop()
  }
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(t => t.stop())
    mediaStream.value = null
  }
  if (form.value.previewUrl && createdUrls.value.includes(form.value.previewUrl)) {
    URL.revokeObjectURL(form.value.previewUrl)
    createdUrls.value = createdUrls.value.filter(u => u !== form.value.previewUrl)
  }
  form.value = { title: '', file: null, previewUrl: null }
  recording.value = false
  activeTab.value = 'upload'
  emit('close')
}

const onFileChange = (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  form.value.file = file
  if (form.value.previewUrl && createdUrls.value.includes(form.value.previewUrl)) {
    URL.revokeObjectURL(form.value.previewUrl)
    createdUrls.value = createdUrls.value.filter(u => u !== form.value.previewUrl)
  }
  const url = URL.createObjectURL(file)
  form.value.previewUrl = url
  createdUrls.value.push(url)
}

const submit = async () => {
  if (uploading.value) return

  if (!form.value.file) {
    alert('Please select or record a video first')
    return
  }

  console.log('Starting upload...', {
    file: form.value.file,
    playerId: props.playerId,
    videoType: props.videoType,
    storage: storage
  })

  uploading.value = true
  uploadProgress.value = 0
  const id = Date.now()
  const title = form.value.title || (props.videoType === 'highlight' ? 'Highlight' : 'Game')
  const date = new Date().toLocaleDateString()
  const collectionName = props.videoType === 'highlight' ? 'highlights' : 'games'

  try {
    const path = `players/${props.playerId || 'unknown'}/${collectionName}/${id}`
    console.log('Upload path:', path)

    const r = storageRef(storage, path)
    const uploadTask = uploadBytesResumable(r, form.value.file)

    console.log('Upload task created, starting...')

    await new Promise((resolve, reject) => {
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          console.log('Upload progress:', progress + '%')
          uploadProgress.value = progress
        },
        (error) => {
          console.error('Upload error:', error)
          reject(error)
        },
        () => {
          console.log('Upload complete!')
          resolve()
        }
      )
    })

    console.log('Getting download URL...')
    const finalUrl = await getDownloadURL(r)
    console.log('Download URL:', finalUrl)

    console.log('Saving to Firestore...')
    const docRef = doc(collection(db, collectionName), String(id))
    await setDoc(docRef, {
      id: String(id),
      playerId: String(props.playerId || '1'),
      title,
      date,
      videoUrl: finalUrl,
      createdAt: new Date().toISOString()
    })
    console.log('Saved to Firestore successfully!')

    emit('saved', props.videoType)
    close()
  } catch (err) {
    console.error('Upload failed:', err)
    alert('Upload failed: ' + (err && err.message))
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

const startRecording = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    mediaStream.value = stream
    const videoEl = recPreview.value
    if (videoEl) {
      videoEl.srcObject = stream
    }
    recordedChunks.value = []
    mediaRecorder.value = new MediaRecorder(stream, { mimeType: 'video/webm' })
    mediaRecorder.value.ondataavailable = (e) => { if (e.data && e.data.size) recordedChunks.value.push(e.data) }
    mediaRecorder.value.onstop = () => {
      const blob = new Blob(recordedChunks.value, { type: 'video/webm' })
      form.value.file = blob
      const url = URL.createObjectURL(blob)
      form.value.previewUrl = url
      createdUrls.value.push(url)
    }
    mediaRecorder.value.start()
    recording.value = true
  } catch (err) {
    alert('Unable to access camera: ' + (err && err.message))
  }
}

const stopRecording = () => {
  if (mediaRecorder.value && recording.value) {
    mediaRecorder.value.stop()
  }
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(t => t.stop())
    mediaStream.value = null
  }
  recording.value = false
}

onBeforeUnmount(() => {
  if (createdUrls.value.length) {
    createdUrls.value.forEach(u => {
      try { URL.revokeObjectURL(u) } catch (e) { }
    })
  }
  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach(t => t.stop())
    mediaStream.value = null
  }
})
</script>
