<template>
  <div id="app">
    <div class="app-layout">
      <Sidebar />
      <main class="main-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script>
import Sidebar from './components/Sidebar.vue'

export default {
  name: 'App',
  components: { Sidebar }
}
</script>

<style>
.app-layout{display:flex;min-height:100vh}
.main-area{flex:1;padding:12px}
@media (max-width:700px){.main-area{padding:8px}}
</style>
