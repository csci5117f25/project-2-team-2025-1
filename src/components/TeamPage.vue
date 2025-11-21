<template>
  <div class="container">
    <!-- Header Navigation -->
    <header class="header">
      <button class="tab active">TEAMS</button>
      <button class="tab">SEASONS</button>
      <button class="tab">SETTINGS</button>
    </header>
    <!-- Main Content -->
    <main class="main-content">
      <h1 class="team-title">ROSEVILLE BASKETBALL TEAM 2025-26</h1>
      <!-- Athletes Section -->
      <div class="section">
        <h2 class="section-title">ATHLETES</h2>

        <div class="player-list">
          <div class="player-item" v-for="player in players" :key="player.id">
            <div class="player-icon">
              <span class="player-emoji" role="img" aria-label="Player avatar">😃</span>
            </div>
            <span class="player-name">{{ player.name }}</span>
          </div>
        </div>
      </div>
      <!-- Action Buttons -->
      <div class="action-buttons">
        <button class="btn btn-new-game">NEW GAME</button>
        <button class="btn btn-edit-team">EDIT TEAM</button>
      </div>
    </main>
  </div>
</template>

<script>
export default {
  name: 'TeamPage',
  data() {
    return {
      players: [
        { id: 1, name: 'PLAYER' },
        { id: 2, name: 'PLAYER 2' },
        { id: 3, name: 'PLAYER 3' },
        { id: 4, name: 'REESE' },
        { id: 5, name: 'JACK H.' }
      ]
    }
  }
}
</script>
