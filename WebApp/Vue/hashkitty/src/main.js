import './assets/main.css'
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap"
import 'bootstrap-icons/font/bootstrap-icons.css'
import axios from 'axios'
import Toast from "vue-toastification"
import "vue-toastification/dist/index.css"

import { io } from "socket.io-client"

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import FieldErrorMessage from './components/global/FieldErrorMessage.vue'
import ConfirmationDialog from './components/global/ConfirmationDialog.vue'

const apiDomain = import.meta.env.VITE_API_DOMAIN
const wsConnection = import.meta.env.VITE_WS_CONNECTION

axios.defaults.serverStorageUrl = apiDomain
axios.defaults.baseURL = apiDomain + '/api'
axios.defaults.headers.common['Content-type'] = 'application/json'

const app = createApp(App)

app.provide('socket',io(wsConnection))

app.use(Toast, {
    position: "top-center",
    timeout: 3000,
    closeOnClick: true,
    pauseOnFocusLoss: true,
    pauseOnHover: true,
    draggable: true,
    draggablePercent: 0.6,
    showCloseButtonOnHover: true,
    hideProgressBar: true,
    closeButton: "button",
    icon: true,
    rtl: false
})

app.use(createPinia())
app.use(router)

app.component('FieldErrorMessage', FieldErrorMessage)
app.component('ConfirmationDialog', ConfirmationDialog)

app.mount('#app')

