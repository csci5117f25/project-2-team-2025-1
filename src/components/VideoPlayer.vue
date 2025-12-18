<template>
  <div>
    <video ref="videoPlayer" class="video-js vjs-default-skin"></video>

    <!-- Add Marker Form -->
    <div class="box mt-4">
      <form @submit.prevent="addMarker" class="marker-form">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="label">Time (seconds):</label>
          </div>
          <div class="field-body">
            <div class="field has-addons">
              <div class="control is-expanded">
                <input v-model.number="newMarker.time" type="number" min="0" step="0.1" required class="input" />
              </div>
              <div class="control">
                <button type="button" @click="useCurrentTime" class="button is-info">Use Current Time</button>
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
            <select id="chapters" ref="chaptersSelect" @change="jumpToChapter($event)">
              <option disabled value="">Select a chapter...</option>
              <option
                v-for="(m, index) in markers"
                :key="index"
                :value="m.time"
              >
                {{ formatTime(m.time) }} - {{ m.text }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Notes Section -->
    <div class="box">
      <div class="notes-header" @click="notesExpanded = !notesExpanded" style="cursor: pointer;">
        <h3 class="title is-5">
          Notes
          <span class="icon is-small">
            <i :class="notesExpanded ? 'arrow-down' : 'arrow-right'">{{ notesExpanded ? '▼' : '▶' }}</i>
          </span>
        </h3>
      </div>

      <!-- Add Note Form -->
      <div v-show="notesExpanded" class="mt-3">
        <form @submit.prevent="addNote" class="note-form">
          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Time (seconds):</label>
            </div>
            <div class="field-body">
              <div class="field has-addons">
                <div class="control is-expanded">
                  <input v-model.number="newNote.time" type="number" min="0" step="0.1" required class="input" />
                </div>
                <div class="control">
                  <button type="button" @click="useCurrentTimeForNote" class="button is-info">Use Current Time</button>
                </div>
              </div>
            </div>
          </div>

          <div class="field is-horizontal">
            <div class="field-label is-normal">
              <label class="label">Note:</label>
            </div>
            <div class="field-body">
              <div class="field">
                <div class="control">
                  <textarea v-model="newNote.text" required class="textarea" placeholder="Add your note here..." rows="3"></textarea>
                </div>
              </div>
            </div>
          </div>

          <div class="field is-horizontal">
            <div class="field-label"></div>
            <div class="field-body">
              <div class="field">
                <div class="control">
                  <button type="submit" class="button is-success">Add Note</button>
                </div>
              </div>
            </div>
          </div>
        </form>

        <!-- Notes List -->
        <div v-if="notes.length > 0" class="notes-list mt-4">
          <div class="tabs is-boxed">
            <ul>
              <li
                v-for="(note, index) in sortedNotes"
                :key="index"
                @click="jumpToTime(note.time)"
                class="note-tab"
              >
                <a>
                  <span class="note-time">{{ formatTime(note.time) }}</span>
                  <span class="note-preview">{{ truncateNote(note.text) }}</span>
                </a>
              </li>
            </ul>
          </div>

          <!-- Detailed notes view -->
          <div class="notes-detail">
            <div v-for="(note, index) in sortedNotes" :key="'detail-' + index" class="note-card box mb-3">
              <div class="level is-mobile">
                <div class="level-left">
                  <div class="level-item">
                    <strong class="has-text-info">{{ formatTime(note.time) }}</strong>
                  </div>
                </div>
                <div class="level-right">
                  <div class="level-item">
                    <button @click="deleteNote(index)" class="delete is-small"></button>
                  </div>
                </div>
              </div>
              <p class="note-text">{{ note.text }}</p>
              <button @click="jumpToTime(note.time)" class="button is-small is-link mt-2">
                <span class="icon is-small">
                  <span>▶</span>
                </span>
                <span>Jump to Time</span>
              </button>
            </div>
          </div>
        </div>
        <div v-else class="has-text-grey-light mt-3">
          No notes yet. Add a note to get started!
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
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase.js'

export default {
  name: "VideoPlayer",

  props: {
    options: {
      type: Object,
      default() {
        return {};
      }
    },
    videoUrl: {
      type: String,
      default: ''
    },
    playerId: {
      type: String,
      default: ''
    },
    gameId: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      player: null,
      markers: [],
      notes: [],
      notesExpanded: true,

      newMarker: {
        time: 0,
        text: ""
      },
      newNote: {
        time: 0,
        text: ""
      },
      defaultVideoOptions: {
        autoplay: false,
        controls: true,
        preload: 'auto',
        fluid: true,
        sources: [
          {
            src: 'https://vjs.zencdn.net/v/oceans.mp4',
            type: 'video/mp4'
          }
        ]
      }
    };
  },

  async mounted() {
    // determine the source: prop -> fetch by gameId -> options/default
    let sourceUrl = this.videoUrl && this.videoUrl.length ? this.videoUrl : '';
    if(!sourceUrl && this.gameId){
      try{
        const url = await this.fetchGameVideoUrl();
        if(url) sourceUrl = url;
      }catch(e){ console.warn('failed to fetch game video url', e); }
    }

    const videoOptions = sourceUrl
      ? Object.assign({}, this.defaultVideoOptions, { sources: [{ src: sourceUrl, type: this.inferType(sourceUrl) }] })
      : (this.options && this.options.sources && this.options.sources.length > 0 ? this.options : this.defaultVideoOptions);

    this.player = videojs(this.$refs.videoPlayer, videoOptions, async () => {
      console.log('Video player is ready');

      // Load markers and notes from database
      await this.loadMarkers();
      await this.loadNotes();

      // Initialize markers plugin
      this.player.markers({
        markerStyle: {
          'width': '7px',
          'background-color': 'red'
        },
        markerTip: {
          display: true,
          text: function(marker) {
            return marker.text;
          }
        },
        markers: this.markers
      });
    });
  },

  watch: {
    options: {
      handler(newOptions) {
        if (this.player && newOptions.sources) {
          this.player.src(newOptions.sources);
          this.player.load();
        }
      },
      deep: true
    }
    ,
    videoUrl(newUrl){
      if(this.player){
        if(newUrl){
          this.player.src([{ src: newUrl, type: this.inferType(newUrl) }])
          this.player.load()
        }
      }
    }
  },

  computed: {
    sortedNotes() {
      return [...this.notes].sort((a, b) => a.time - b.time);
    }
  },

  methods: {
    useCurrentTime() {
      if (this.player) {
        const currentTime = this.player.currentTime();
        this.newMarker.time = Math.round(currentTime * 10) / 10; // Round to 1 decimal place
        console.log('Current time captured:', this.newMarker.time);
      } else {
        console.warn('Player not ready');
      }
    },
    useCurrentTimeForNote() {
      if (this.player) {
        const currentTime = this.player.currentTime();
        this.newNote.time = Math.round(currentTime * 10) / 10;
        console.log('Current time captured for note:', this.newNote.time);
      } else {
        console.warn('Player not ready');
      }
    },
    async addMarker() {
      const markerData = {
        time: this.newMarker.time,
        text: this.newMarker.text
      };

      this.player.markers.add([markerData]);

      this.markers.push(markerData);

      // Save markers to database
      await this.saveMarkers();

      this.$nextTick(() => { try{ this.openChapters() }catch(e){} })

      this.newMarker.time = 0;
      this.newMarker.text = "";
    },

    jumpToChapter(event) {
      try {
        const time = Number(event.target.value);
        console.log('Jumping to chapter at time:', time, 'Player exists:', !!this.player);

        if (isNaN(time) || time < 0) {
          console.warn('Invalid time value:', time);
          return;
        }

        if (!this.player) {
          console.warn('Player not initialized');
          return;
        }

        // Direct approach - set current time
        try {
          this.player.currentTime(time);
          console.log('Current time set to:', this.player.currentTime());
          // Optional: play after seeking
          if (this.player.paused()) {
            this.player.play();
          }
        } catch (err) {
          console.error('Error setting current time:', err);
        }

        // Reset select to default
        this.$nextTick(() => {
          if (this.$refs.chaptersSelect) {
            this.$refs.chaptersSelect.value = '';
          }
        });
      } catch (error) {
        console.error('Error jumping to chapter:', error);
      }
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
    },
    async addNote() {
      const noteData = {
        time: this.newNote.time,
        text: this.newNote.text,
        timestamp: new Date().toISOString()
      };

      this.notes.push(noteData);

      // Save notes to database
      await this.saveNotes();

      this.newNote.time = 0;
      this.newNote.text = "";
    },
    jumpToTime(time) {
      try {
        if (!this.player) {
          console.warn('Player not initialized');
          return;
        }

        this.player.currentTime(time);
        console.log('Jumped to time:', time);

        if (this.player.paused()) {
          this.player.play();
        }
      } catch (error) {
        console.error('Error jumping to time:', error);
      }
    },
    deleteNote(index) {
      this.notes.splice(index, 1);
      this.saveNotes();
    },
    truncateNote(text, maxLength = 30) {
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    },
    openChapters(){
      try{
        const el = this.$refs.chaptersSelect || document.getElementById('chapters')
        if(!el) return
        // focus then try to open: click + synthetic keydown ArrowDown
        el.focus()
        try{ el.click() }catch(e){}
        const ev = new KeyboardEvent('keydown', { key: 'ArrowDown', code: 'ArrowDown', bubbles: true })
        try{ el.dispatchEvent(ev) }catch(e){}
      }catch(e){ console.warn('openChapters failed', e) }
    },
    inferType(url){
      if(!url) return 'video/mp4'
      const u = url.split('?')[0].toLowerCase()
      if(u.endsWith('.m3u8')) return 'application/x-mpegURL'
      if(u.endsWith('.webm')) return 'video/webm'
      if(u.endsWith('.mp4')) return 'video/mp4'
      return 'video/mp4'
    },
    async fetchGameVideoUrl(){
      try{
        if(!this.gameId) return ''
        const gRef = doc(db, 'games', String(this.gameId))
        const gSnap = await getDoc(gRef)
        if(gSnap.exists()){
          const data = gSnap.data()
          return data && data.videoUrl ? data.videoUrl : ''
        }
        return ''
      }catch(e){ console.warn('fetchGameVideoUrl error', e); return '' }
    },
    async loadMarkers(){
      try{
        if(!this.gameId) return
        const gRef = doc(db, 'games', String(this.gameId))
        const gSnap = await getDoc(gRef)
        if(gSnap.exists()){
          const data = gSnap.data()
          this.markers = data && data.markers ? data.markers : []
        }
      }catch(e){ console.warn('loadMarkers error', e) }
    },
    async saveMarkers(){
      try{
        if(!this.gameId) return
        const gRef = doc(db, 'games', String(this.gameId))
        await updateDoc(gRef, { markers: this.markers })
        console.log('Markers saved successfully')
      }catch(e){
        console.warn('saveMarkers error', e)
        // If document doesn't exist, create it
        if(e.code === 'not-found'){
          try{
            await setDoc(gRef, { markers: this.markers }, { merge: true })
            console.log('Markers saved with setDoc')
          }catch(err){ console.warn('setDoc error', err) }
        }
      }
    },
    async loadNotes(){
      try{
        if(!this.gameId) return
        const gRef = doc(db, 'games', String(this.gameId))
        const gSnap = await getDoc(gRef)
        if(gSnap.exists()){
          const data = gSnap.data()
          this.notes = data && data.notes ? data.notes : []
        }
      }catch(e){ console.warn('loadNotes error', e) }
    },
    async saveNotes(){
      try{
        if(!this.gameId) return
        const gRef = doc(db, 'games', String(this.gameId))
        await updateDoc(gRef, { notes: this.notes })
        console.log('Notes saved successfully')
      }catch(e){
        console.warn('saveNotes error', e)
        // If document doesn't exist, create it
        if(e.code === 'not-found'){
          try{
            await setDoc(gRef, { notes: this.notes }, { merge: true })
            console.log('Notes saved with setDoc')
          }catch(err){ console.warn('setDoc error', err) }
        }
      }
    }
  },

  beforeUnmount() {
    if (this.player) this.player.dispose();
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

.note-form {
  margin-bottom: 20px;
}

.notes-header {
  display: flex;
  align-items: center;
  user-select: none;
}

.notes-header:hover {
  background-color: #f5f5f5;
  border-radius: 4px;
  padding: 4px;
  margin: -4px;
}

.note-tab {
  cursor: pointer;
  transition: all 0.2s ease;
}

.note-tab:hover {
  background-color: #f0f0f0;
}

.note-tab a {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.note-time {
  font-weight: bold;
  color: #3273dc;
  font-size: 0.9em;
}

.note-preview {
  font-size: 0.85em;
  color: #666;
}

.note-card {
  background-color: #fafafa;
  border-left: 4px solid #3273dc;
}

.note-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  margin-top: 8px;
}

.notes-detail {
  margin-top: 20px;
}
</style>
