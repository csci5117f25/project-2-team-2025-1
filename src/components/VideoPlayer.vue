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

      newMarker: {
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

      // Load markers from database
      await this.loadMarkers();

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
</style>
