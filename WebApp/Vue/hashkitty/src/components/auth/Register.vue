<script setup>
import { ref } from 'vue';
import axios from 'axios';
import { useToast } from "vue-toastification"
import { useRouter, onBeforeRouteLeave } from 'vue-router'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const toast = useToast()
const router = useRouter()


const passwordMatchError = ref(null);
const errors = ref(null)
const confirmationLeaveDialog = ref(null)
let originalValueStr = ''

const newUser = () => {
    return {
      email: '',
      username: '',
      user_type: '',
      password: '',
      confirmPassword: '',
    }
}

const user = ref(newUser())

const save = async() => {
  try {
    if(user.value.password !== user.value.confirmPassword){
      throw new Error('Passwords are different')
    }

    if(userStore.user && userStore.user.type == 'admin'){
      user.value.user_type = 'admin'
    }else{
      user.value.user_type = 'user'
    }
    await axios.post('register', user.value)
    toast.success('User ' + user.value.username + ' was registered successfully.')
    originalValueStr = JSON.stringify(user.value)
    router.push( {name: 'Login' })
  } catch (error) {
    toast.error(error.message)
  }
}

const cancel = () => {
  if(userStore.user.type == 'admin'){
    router.push({name: 'AdminDashboard'})
  }
  else{
    router.push({name: 'Home'})
  }
  
}

const clickMenuOption = () => {
  const domReference = document.getElementById('buttonSidebarExpandId');
  if (domReference && window.getComputedStyle(domReference).display !== "none") {
    domReference.click();
  }
};

let nextCallBack = null
const leaveConfirmed = () => {
  if (nextCallBack) {
    nextCallBack()
  }
}

onBeforeRouteLeave((to, from, next) => {
  nextCallBack = null
  let newValueStr = JSON.stringify(user.value)
  if (originalValueStr != newValueStr) {
    nextCallBack = next
    confirmationLeaveDialog.value.show()
  } else {
    next()
  }
})
</script>

<template>
    <div class="center-container" style="margin-top: 112px;">
      <div class="p-card p-shadow-2 p-mb-4 p-border-rounded" style="width: 100%; max-width: 360px;">
        <div class="text-center p-mb-5">
          <img src="../../assets/hashkittyNormal.svg" alt="Hashkitty SVG Image" height="200" class="p-mb-3">
          <br>
          <div class="text-3xl p-font-weight-bold p-mb-3">Create an Account</div>
          <span v-if=" userStore.user && userStore.user.type == 'admin' " class="text-600">Already have an account?</span>
          <router-link :to="{ name: 'Login' }" :class="{ active: $route.name === 'Login' }" @click="clickMenuOption">
          <a href="#" class="p-font-weight-bold p-ml-2 p-text-blue p-cursor-pointer">Sign in</a>
          </router-link>
        </div>
        <br>
        <form class="needs-validation" novalidate @submit.prevent="save">
          <div class="form-group">
            <input type="text" class="form-control bg-dark custom-text-color" placeholder="Username" v-model="user.username" required>
          </div>
          <br>
          <div class="form-group">
            <input type="email" class="form-control bg-dark custom-text-color" placeholder="Email" v-model="user.email" required>
          </div>
          <br>
          <div class="form-group">
            <input type="password" class="form-control bg-dark custom-text-color" placeholder="Password" v-model="user.password" required>
          </div>
          <br>
          <div class="form-group">
            <input type="password" class="form-control bg-dark custom-text-color" placeholder="Confirm Password" v-model="user.confirmPassword" required>
          </div>
          <br>
          <button type="button" class="btn btn-secondary" @click="save">Register</button>
          <button type="button" class="btn btn-light px-3 mx-2" @click="cancel">Cancel</button>

        </form>
      </div>
    </div>
    <confirmation-dialog
    ref="confirmationLeaveDialog"
    confirmationBtn="Discard changes and leave"
    msg="Do you really want to leave? You have unsaved changes!"
    @confirmed="leaveConfirmed"
  >
  </confirmation-dialog>    
  </template>
  
  <style>
  .center-container {
    display: flex;
    flex-direction: column;
    justify-content: center; 
    align-items: center;
    height: 50vh; 
  }
  .custom-text-color::placeholder {
    color: white;
  }
  .form-control:focus {
  color: white;
}
  .custom-text-color {
    color: white;
  }
  </style>
  