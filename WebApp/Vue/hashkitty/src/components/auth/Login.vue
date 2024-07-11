<script setup>
import { ref, watch, onMounted} from 'vue';
import axios from 'axios';
import { useToast } from "vue-toastification"
import { useRouter } from 'vue-router'
import { useUserStore } from '../../stores/user.js'
import * as bootstrap from 'bootstrap';

const toast = useToast()
const router = useRouter()
const userStore = useUserStore()
const totpToken = ref('');
const showTotpModal = ref(false);
let tempUsername = '';

const credentials = ref({
      username: '',
      password: ''
  })

  const login = async () => {
    const response = await userStore.login(credentials.value)
  if (response) {
    if (response.token) {
      sessionStorage.setItem('token', response.token)
      axios.defaults.headers.common.Authorization = "Bearer " + response.token;
      await userStore.loadUser()
      toast.success('Username ' + userStore.user.username + ' has entered the application.')
      if (userStore.user.type === 'admin') {
        router.push({ name: 'AdminDashboard' });
      } else {
        router.push({ name: 'Dashboard' });
      }
    } else if (response.message === 'TOTP required') {
      tempUsername = credentials.value.username;
      showTotpModal.value = true;
      const modal = new bootstrap.Modal(document.getElementById('totpModal'));
      modal.show();
    } else {
      toast.error('Login failed. Please try again.');
      credentials.value.password = ''
    }
  }
}

const clickMenuOption = () => {
  const domReference = document.getElementById('buttonSidebarExpandId');
  if (domReference && window.getComputedStyle(domReference).display !== "none") {
    domReference.click();
  }
};

const verifyTotp = async () => {
  try {
    const response = await axios.post('/login/totp', {
      username: tempUsername,
      token: totpToken.value,
    });
    
    if (response.data.token) {
      sessionStorage.setItem('token', response.data.token)
      axios.defaults.headers.common.Authorization = "Bearer " + response.data.token;
      await userStore.loadUser();
      showTotpModal.value = false;
      const modal = bootstrap.Modal.getInstance(document.getElementById('totpModal'));
      modal.hide();
      if (userStore.user.type === 'admin') {
        router.push({ name: 'AdminDashboard' });
      } else {
        router.push({ name: 'Dashboard' });
      }
    } else {
      toast.error('Invalid TOTP code. Please try again.');
    }
  } catch (error) {
    console.error('TOTP verification failed:', error);
    toast.error('TOTP verification failed. Please try again.');
  }
};

onMounted(() => {
  const modalElement = document.getElementById('totpModal');
  modalElement.addEventListener('show.bs.modal', () => {
    showTotpModal.value = true;
    setTimeout(() => {
      const inputElement = modalElement.querySelector('input');
      if (inputElement) {
        inputElement.focus();
      }
    }, 500); 
  });
  modalElement.addEventListener('hide.bs.modal', () => {
    showTotpModal.value = false;
  });
});

</script>
<template>
  <div class="center-container" style="margin-top: 50px;">
    <div class="p-card p-shadow-2 p-mb-4 p-border-rounded" style="width: 100%; max-width: 360px;">
      <div class="text-center p-mb-5">
        <img src="../../assets/hashkittyNormal.svg" alt="Hashkitty SVG Image" height="200" class="p-mb-3">
        <br>
        <div class="text-3xl p-font-weight-bold p-mb-3">Welcome Back</div>
        <span class="text-600">Don't have an account?</span>
        <router-link :to="{ name: 'Register' }" :class="{ active: $route.name === 'Register' }" @click="clickMenuOption">
          <a href="#" class="p-font-weight-bold p-ml-2 p-text-blue p-cursor-pointer">Create today!</a>
        </router-link>
      </div>
      <br>
      <form @submit.prevent="signIn">
        <div class="form-group">
          <input type="text" class="form-control bg-dark custom-text-color" placeholder="Username" v-model="credentials.username" required autofocus>
        </div>
        <br>
        <div class="form-group">
          <input type="password" class="form-control bg-dark custom-text-color" placeholder="Password" v-model="credentials.password" required>
        </div>
        <br>
        <button type="submit" class="btn btn-secondary" @click="login">Sign In</button>
      </form>
    </div>
    <div class="modal fade" id="totpModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="totpModalLabel" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content bg-dark">
          <div class="modal-header">
            <h1 class="modal-title fs-5" id="totpModalLabel">Enter TOTP Code</h1>
            <button type="button" class="btn-close" data-bs-dismiss="modal" style="background-color: lightgray;" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <input type="text" v-model="totpToken" class="form-control edit_input" placeholder="TOTP Code" style="width: 450px;" >
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-info" @click="verifyTotp">Verify</button>
          </div>
        </div>
      </div>
    </div>
  </div>
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
.custom-text-color {
  color: white;
}
.form-control:focus {
  color: white;
}
.edit_input {
  color: lightgray;
  background-color: #3d3939;
}
.edit_input:focus {
  background-color: #3d3939;
  outline: none;
}
.edit_input::placeholder {
  color: white;
}
</style>
