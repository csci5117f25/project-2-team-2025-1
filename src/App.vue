<template>
  <div id="app">
    <Auth v-if="!user" @user-changed="handleUserChanged" />
    <router-view v-else />
  </div>
</template>

<script>
import Auth from './components/Auth.vue'

export default {
  name: 'App',
  components: {
    Auth
  },
  data() {
    return {
      user: null
    }
  },
  methods: {
    handleUserChanged(user) {
      this.user = user
    }
  }
}
</script>
