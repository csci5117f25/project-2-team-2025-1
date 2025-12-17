<template>
  <div class="container">
    <div class="section">
<button
        @click="$router.back()"
        class="button is-text mb-3"
      >
        <span class="icon">←</span>
        <span>Back to Player</span>
      </button>

      <h1 class="title is-4 mb-4">{{ gameTitle }}</h1>

      <video ref="videoPlayer" class="video-js vjs-default-skin"></video>

      <!-- Add Marker Form -->
      <div class="box mt-4">
      <form @submit.prevent="addMarker" class="marker-form">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Time (seconds or MM:SS):</label>
          </div>
          <div class="field-body">
            <div class="field has-addons">
              <div class="control is-expanded">
                <input v-model="newMarker.timeInput" type="text" placeholder="e.g. 34 or 1:14" required class="input" />
              </div>
              <div class="control">
                <button type="button" class="button" @click.prevent="setTimeToCurrent">Add Here</button>
              </div>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Label:</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input v-model="newMarker.text" type="text" required class="input" placeholder="e.g., Great shot!" />
              </div>
            </div>
          </div>
        </div>

        <div class="field is-horizontal">
          <div class="field-label"></div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <button type="submit" class="button is-primary">Add Marker</button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>

    <!-- Chapters Dropdown -->
    <div class="box">
      <div class="field">
        <label for="chapters" class="label">Jump to Chapter:</label>
        <div class="control">
          <div class="select is-fullwidth">
            <select id="chapters" @change="jumpToChapter($event)">
              <option disabled selected value="">Select a chapter...</option>
              <option
                v-for="(m, index) in markers"
                :key="index"
                :value="m.time"
              >
                {{ formatTime(m.time) }} - {{ (m.text && m.text.length > 30) ? (m.text.slice(0,30) + '...') : m.text }}
              </option>
            </select>
          </div>
        </div>
      </div>
      <!-- Summary button -->
      <div style="margin-top:12px">
        <button class="button is-light" @click="showSummary = !showSummary">Summary</button>
      </div>

      <!-- Summary list -->
      <div v-if="showSummary" class="box" style="margin-top:12px">
        <div v-if="!markers || markers.length===0" class="content">No chapters/markers</div>
        <div v-else>
          <div v-for="(m, idx) in markers" :key="idx" class="level is-mobile" style="align-items:center;padding:6px 0;border-bottom:1px solid #eee">
            <div class="level-left" style="min-width:110px">
              <div class="level-item has-text-weight-semibold">{{ formatTime(m.time) }}</div>
            </div>
            <div class="level-item" style="flex:1">
              <div v-if="editingIndex !== idx">{{ m.text }}</div>
              <div v-else class="field has-addons">
                <div class="control is-expanded">
                  <input class="input" v-model="editText" />
                </div>
                <div class="control">
                  <button class="button is-success" @click="saveEdit(idx)">Save</button>
                </div>
                <div class="control">
                  <button class="button" @click="cancelEdit">Cancel</button>
                </div>
              </div>
            </div>
            <div class="level-right">
              <div class="level-item">
                <button class="button is-small is-info" v-if="editingIndex !== idx" @click="startEdit(m, idx)">Edit</button>
              </div>
              <div class="level-item">
                <button class="button is-small is-danger" @click="deleteMarker(m, idx)">Delete</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </div>
</template>

<script>
import videojs from "video.js";
import "video.js/dist/video-js.css";

// videojs-markers plugin
import "videojs-markers";
import "videojs-markers/dist/videojs.markers.css";

import { useDocument, useFirestore } from 'vuefire'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { db } from '../firebase.js'
import { computed } from 'vue'

export default {
  name: "VideoPlayer",

  props: {
    playerId: String,
    gameId: String
  },

  setup(props) {
    const db = useFirestore()
    const game = useDocument(doc(db, 'games', props.gameId))
    const player = useDocument(doc(db, 'players', props.playerId))

    const teamId = computed(() => player.value?.teamId || null)
    const gameTitle = computed(() => game.value?.title || 'Loading...')

    return { game, player, teamId, gameTitle }
  },

      data() {
    return {
      videoPlayer: null,
      markers: [],
      showSummary: false,
      editingIndex: -1,
      editText: '',
      newMarker: {
        timeInput: '0',
        text: ""
      }
    };
  },

  mounted() {
    this.$nextTick(() => {
      if (this.game) {
        this.initPlayer()
      }
    })
  },

  watch: {
    game: {
      handler(newGame) {
        if (newGame && newGame.videoUrl && !this.videoPlayer) {
          this.initPlayer()
        }
      },
      immediate: true
    }
  },

  methods: {

    initPlayer() {
      if (!this.game || !this.game.videoUrl || this.videoPlayer) return

      // load markers from game doc (if any) into local markers array
      try{
        const gm = this.game && this.game.markers ? this.game.markers : (this.game && this.game.value && this.game.value.markers ? this.game.value.markers : [])
        if(Array.isArray(gm)){
          this.markers = gm.map(m => ({ time: Number(m.time), text: String(m.text || '') }))
        } else {
          this.markers = []
        }
      }catch(e){ this.markers = [] }

      const videoOptions = {
        autoplay: false,
        controls: true,
        preload: 'auto',
        fluid: true,
        sources: [{
          src: this.game.videoUrl,
          type: 'video/mp4'
        }]
      }

      this.videoPlayer = videojs(this.$refs.videoPlayer, videoOptions, () => {
        this.videoPlayer.markers({
          markers: this.markers || [],
          markerStyle: {
            width: "7px",
            "border-radius": "30%",
            "background-color": "red"
          },
          markerTip: {
            display: true,
            text: marker => marker.text
          }
        })
      })
    },

    async addMarker() {
      // parse time input: allow seconds (e.g. "34.5") or MM:SS (e.g. "1:14")
      let timeSeconds = 0
      try{
        const t = (this.newMarker.timeInput || '').toString().trim()
        if(t.includes(':')){
          const parts = t.split(':').map(p=>p.trim()).filter(Boolean)
          // support M:SS or H:MM:SS by taking last two as minutes/seconds
          const secsPart = parts.pop()
          const minsPart = parts.length ? parts.pop() : '0'
          const mins = Number(minsPart) || 0
          const secs = Number(secsPart) || 0
          timeSeconds = mins * 60 + secs
        } else {
          timeSeconds = Number(t) || 0
        }
      }catch(e){ timeSeconds = 0 }

      const markerData = {
        time: Number(timeSeconds),
        text: String(this.newMarker.text || '')
      };

      // update video player UI markers
      try{
        if(this.videoPlayer && this.videoPlayer.markers){
          this.videoPlayer.markers.add([markerData]);
        }
      }catch(e){ console.warn('Failed to add UI marker', e) }

      // push to Firestore: add to `markers` array field on the game doc (creates field if missing)
      try{
        if(this.gameId){
          const gRef = doc(db, 'games', String(this.gameId))
          await updateDoc(gRef, { markers: arrayUnion(markerData) })
        } else if(this.game && this.game.id){
          const gRef = doc(db, 'games', String(this.game.id))
          await updateDoc(gRef, { markers: arrayUnion(markerData) })
        }
      }catch(err){ console.error('Failed to save marker to Firestore', err) }

      // update local markers list
      this.markers.push(markerData);

      // reset form
      this.newMarker.timeInput = '0';
      this.newMarker.text = "";
    },

    setTimeToCurrent(){
      try{
        if(this.videoPlayer && typeof this.videoPlayer.currentTime === 'function'){
          const t = Number(this.videoPlayer.currentTime()) || 0
          const mins = Math.floor(t/60)
          const secs = Math.floor(t%60).toString().padStart(2,'0')
          this.newMarker.timeInput = mins>0 ? `${mins}:${secs}` : `${Math.floor(t)}`
        }
      }catch(e){ console.warn('Could not read video time', e) }
    },

    startEdit(marker, idx){
      this.editingIndex = idx
      this.editText = marker.text || ''
      // ensure summary visible
      this.showSummary = true
    },

    cancelEdit(){
      this.editingIndex = -1
      this.editText = ''
    },

    async saveEdit(idx){
      try{
        const gm = (this.game && this.game.markers) ? this.game.markers : (this.game && this.game.value && this.game.value.markers ? this.game.value.markers : this.markers)
        if(!Array.isArray(gm)) return
        const newArr = gm.slice()
        if(!newArr[idx]) return
        newArr[idx] = Object.assign({}, newArr[idx], { text: String(this.editText || '') })
        const gId = this.gameId || (this.game && this.game.id) || (this.game && this.game.value && this.game.value.id)
        if(!gId) return
        const gRef = doc(db, 'games', String(gId))
        await updateDoc(gRef, { markers: newArr })
        // update local state
        this.markers = newArr.map(m => ({ time: Number(m.time), text: String(m.text || '') }))
        this.cancelEdit()
        // refresh UI markers
        try{ if(this.videoPlayer && this.videoPlayer.markers){ this.videoPlayer.markers.reset(this.markers) } }catch(e){}
      }catch(err){ console.error('Failed to save marker edit', err) }
    },

    async deleteMarker(marker, idx){
      try{
        const gm = (this.game && this.game.markers) ? this.game.markers : (this.game && this.game.value && this.game.value.markers ? this.game.value.markers : this.markers)
        if(!Array.isArray(gm)) return
        const newArr = gm.slice()
        // remove by index (more robust than value-match)
        if(idx < 0 || idx >= newArr.length) return
        newArr.splice(idx, 1)
        const gId = this.gameId || (this.game && this.game.id) || (this.game && this.game.value && this.game.value.id)
        if(!gId) return
        const gRef = doc(db, 'games', String(gId))
        await updateDoc(gRef, { markers: newArr })
        // update local
        this.markers = newArr.map(m => ({ time: Number(m.time), text: String(m.text || '') }))
        // update UI markers
        try{ if(this.videoPlayer && this.videoPlayer.markers){ this.videoPlayer.markers.reset(this.markers) } }catch(e){}
      }catch(err){ console.error('Failed to delete marker', err) }
    },

    jumpToChapter(event) {
      const time = Number(event.target.value);
      if (!isNaN(time) && this.videoPlayer) {
        this.videoPlayer.currentTime(time);
      }
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    }
  },

  beforeUnmount() {
    if (this.videoPlayer) this.videoPlayer.dispose();
  }
};
</script>

<style scoped>
.video-js {
  width: 100%;
  height: auto;
}

.marker-form {
  margin-top: 20px;
}

/* Truncate long option text in the chapters select and keep dropdown width matching */
.select.is-fullwidth { max-width: 100%; }
.select.is-fullwidth select {
  width: 100%;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-appearance: none;
  appearance: none;
}
.select.is-fullwidth select option {
  white-space: nowrap;
}
</style>
