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
            <label class="label">Time (seconds):</label>
          </div>
          <div class="field-body">
            <div class="field">
              <div class="control">
                <input v-model.number="newMarker.time" type="number" min="0" step="0.1" required class="input" />
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
                {{ formatTime(m.time) }} - {{ m.text }}
              </option>
            </select>
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
import { doc } from 'firebase/firestore'
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
      newMarker: {
        time: 0,
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
          markers: [],
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

    addMarker() {
      const markerData = {
        time: this.newMarker.time,
        text: this.newMarker.text
      };

      this.videoPlayer.markers.add([markerData]);

      this.markers.push(markerData);

      this.newMarker.time = 0;
      this.newMarker.text = "";
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
</style>
