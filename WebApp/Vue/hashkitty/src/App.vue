<script setup>
import axios from 'axios'
import { useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
import { useUserStore } from './stores/user.js'
import { useToast } from "vue-toastification"


const toast = useToast()
const router = useRouter();
const userStore = useUserStore()

const logout = async () => {
  if (await userStore.logout()) {
    toast.success('User has logged out of the application.')
    clickMenuOption()
    router.push({ name: 'Home' })
  } else {
    toast.error('There was a problem logging out of the application!')
  }
}

const clickMenuOption = () => {
  const domReference = document.getElementById('buttonSidebarExpandId');
  if (domReference && window.getComputedStyle(domReference).display !== "none") {
    domReference.click();
  }
};

const imageClick = async () => {
  if (userStore.user) {
    if(userStore.user.type == 'admin')
      router.push({ name: 'AdminDashboard' });
    else{
      router.push({ name: 'Dashboard' });
    }
    await getMiddlewareInfo();
  } else {
    router.push({ name: 'Home' });
  }
};
</script>

<template>
  <div>
    <nav class="navbar navbar-expand-md navbar-dark bg-dark sticky-top flex-md-nowrap shadow">
      <div class="svg-container" style="margin-left: 0.8rem;">
        <img v-if="!userStore.user" src="./assets/hashkittyLetters.svg" alt="Hashkitty SVG Image" @click="imageClick">
        <img v-if="userStore.user" src="./assets/hashkitty.svg" alt="Hashkitty SVG Image" @click="imageClick">
      </div>
    <div class="collapse navbar-collapse justify-content-start" id="navbarNav">
      <ul class="navbar-nav">
        <li class="nav-item"  v-show="userStore.user && userStore.user.type == 'user'">
          <router-link style="margin-left: 0.5rem;" class="nav-link btn btn-secondary btn-lg" :to="{ name: 'Dashboard' }" :class="{ active: $route.name === 'Dashboard' }">
            Dashboard
          </router-link>
        </li>
        <li class="nav-item"  v-show="userStore.user && userStore.user.type == 'user'">
          <router-link style="margin-left: 0.5rem;" class="nav-link btn btn-secondary btn-lg" :to="{ name: 'Jobs' }" :class="{ active: $route.name === 'Jobs' }">
            Jobs
          </router-link>
        </li>
        <li class="nav-item" v-show="userStore.user && userStore.user.type == 'admin'">
          <router-link style="margin-left: 0.5rem;" class="nav-link btn btn-secondary btn-lg" :to="{ name: 'AdminDashboard' }" :class="{ active: $route.name === 'AdminDashboard' }">
            Dashboard
          </router-link>
        </li>
        <li class = "nav-item" v-show="userStore.user && userStore.user.type == 'admin'">
          <router-link style="margin-left: 0.5rem;" class="nav-link btn btn-secondary btn-lg" :to="{ name: 'UserManagement' }" :class="{ active: $route.name === 'UserManagement' }">
            User Management
          </router-link>
        </li>
        <li class = "nav-item" v-show="userStore.user && userStore.user.type == 'admin'">
          <router-link style="margin-left: 0.5rem;" class="nav-link btn btn-secondary btn-lg" :to="{ name: 'Management' }" :class="{ active: $route.name === 'Management' }">
            Node Management
          </router-link>
        </li>
        <li class = "nav-item" v-show="userStore.user && userStore.user.type == 'admin'">
          <router-link style="margin-left: 0.5rem;" class="nav-link btn btn-secondary btn-lg" :to="{ name: 'WaitList' }" :class="{ active: $route.name === 'WaitList' }">
            WaitList
          </router-link>
        </li>
      </ul>
    </div>
    <div class="collapse navbar-collapse justify-content-end" id="navbarNav">
      <ul class="navbar-nav">
        <li class="nav-item" v-show="!userStore.user">
          <router-link style="margin-right: 1rem;"class="nav-link btn btn-secondary  btn-lg" :to="{ name: 'Login' }" :class="{ active: $route.name === 'Login' }" @click="clickMenuOption">
            Sign In
          </router-link>
        </li>
        <li class="nav-item" v-show="userStore.user && userStore.user.type == 'admin'">
          <router-link style="margin-right: 1rem;"class="nav-link btn btn-secondary  btn-lg" :to="{ name: 'Register' }" :class="{ active: $route.name === 'Register' }" @click="clickMenuOption">
            Register a new Admin
          </router-link>
        </li>
        <li class="nav-item" v-show="userStore.user">
          <router-link style="margin-right: 1rem;"class="nav-link btn btn-secondary" :to="{ name: 'Profile' }" 
          :class="{ active: $route.name === 'Profile' }" @click="clickMenuOption">
            Profile
          </router-link>
        </li>
        <li class="nav-item" v-show="userStore.user">
          <a style="margin-right: 1rem;"class="nav-link btn btn-danger" @click.prevent="logout">
            <i></i>Logout
          </a>
        </li>
      </ul>
    </div>
</nav>
    <main class="container">
      <div class="content-wrapper">
        <router-view></router-view>
      </div>
    </main>
  </div>
</template>

<style scoped>
@import "./assets/dashboard.css";

.svg-container {
  width: 200px; 
  height: auto; 
}
.navbar{
  padding-top: 10px ;
  padding-bottom: 10px;
  width: 100%;
}
.nav-link.active {
  background-color: rgba(76, 67, 67, 0);
}

</style>
