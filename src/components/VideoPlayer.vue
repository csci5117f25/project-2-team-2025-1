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
</template>

<script>
import videojs from "video.js";
import "video.js/dist/video-js.css";

// videojs-markers plugin
import "videojs-markers";
import "videojs-markers/dist/videojs.markers.css";

export default {
  name: "VideoPlayer",

  props: {
    options: {
      type: Object,
      default() {
        return {};
      }
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

  mounted() {
    const videoOptions = this.options && this.options.sources && this.options.sources.length > 0
      ? this.options
      : this.defaultVideoOptions;

    this.player = videojs(this.$refs.videoPlayer, videoOptions, () => {
      console.log("Video ready");

      // Initialize plugin with tooltip enabled
      this.player.markers({
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
  },

  methods: {
    addMarker() {
      const markerData = {
        time: this.newMarker.time,
        text: this.newMarker.text
      };

      this.player.markers.add([markerData]);

      this.markers.push(markerData);

      this.newMarker.time = 0;
      this.newMarker.text = "";
    },

    jumpToChapter(event) {
      const time = Number(event.target.value);
      if (!isNaN(time) && this.player) {
        this.player.currentTime(time);
      }
    },

    formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, "0");
      return `${mins}:${secs}`;
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
