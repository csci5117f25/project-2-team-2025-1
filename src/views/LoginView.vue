<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { db, auth } from '../firebase.js'

const router = useRouter()
const user = ref(null)

onAuthStateChanged(auth, (u) => {
  user.value = u
})

watch(user, (v) => {
  if(v) router.push('/')
})

async function login(){
  try{
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const u = result.user
    if(u){
      await setDoc(doc(db,'users', u.uid), { uid: u.uid, displayName: u.displayName, email: u.email }, { merge: true })
    }
  }catch(err){
    console.error(err)
    alert('Login failed')
  }
}

async function logout(){
  try{ await signOut(auth) }catch(e){ alert('Logout failed') }
}
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <h1 class="title">Sign In</h1>
      <p v-if="user">Redirecting...</p>
      <button v-if="!user" class="google-btn" @click="login">Sign in with Google</button>
      <button v-else class="logout-btn" @click="logout">Log Out</button>
    </div>
  </div>
</template>

<style scoped>
.login-container{display:flex;align-items:center;justify-content:center;height:100vh}
.login-card{background:#fff;padding:24px;border-radius:8px;width:360px;text-align:center}
.title{font-weight:700;margin-bottom:16px}
.google-btn{background:#00bd7e;color:#fff;padding:10px 12px;border-radius:8px;border:none;cursor:pointer}
.logout-btn{background:#d9534f;color:#fff;padding:10px 12px;border-radius:8px;border:none;cursor:pointer}
</style>
