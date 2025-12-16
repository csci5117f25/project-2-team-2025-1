<template>
  <div class="auth-container">
    <div class="auth-box">
      <h1 class="title">Basketball Team Tracker</h1>
      <div v-if="!user" class="auth-content">
        <p class="subtitle">Sign in to manage your teams</p>
        <button class="button is-primary is-large" @click="signInWithGoogle">
          Sign in with Google
        </button>
      </div>
      <div v-else class="auth-content">
        <p class="subtitle">Hello, {{ user.displayName }}</p>
        <button class="button" @click="signOut">Sign Out</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'Auth',
  setup(props, { emit }) {
    const user = ref(null)
    const auth = getAuth()

    const signInWithGoogle = async () => {
      const provider = new GoogleAuthProvider()
      try {
        const result = await signInWithPopup(auth, provider)
        user.value = result.user
        emit('user-changed', result.user)
      } catch (error) {
        console.error('Error signing in:', error)
        alert('Failed to sign in: ' + error.message)
      }
    }

    const signOut = async () => {
      try {
        await firebaseSignOut(auth)
        user.value = null
        emit('user-changed', null)
      } catch (error) {
        console.error('Error signing out:', error)
      }
    }

    onMounted(() => {
      onAuthStateChanged(auth, (currentUser) => {
        user.value = currentUser
        emit('user-changed', currentUser)
      })
    })

    return { user, signInWithGoogle, signOut }
  }
}
</script>

<style scoped>
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.auth-box {
  background: white;
  padding: 3rem;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  text-align: center;
  max-width: 400px;
  width: 90%;
}

.title {
  font-size: 1.8rem;
  font-weight: 700;
  margin-bottom: 1rem;
  color: #333;
}

.subtitle {
  color: #666;
  margin-bottom: 2rem;
}

.auth-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

button {
  padding: 12px 24px;
  font-size: 16px;
  cursor: pointer;
  border: none;
  border-radius: 5px;
  transition: all 0.3s;
}

.button.is-primary {
  background: #667eea;
  color: white;
}

.button.is-primary:hover {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.button.is-large {
  padding: 16px 32px;
  font-size: 18px;
}
</style>