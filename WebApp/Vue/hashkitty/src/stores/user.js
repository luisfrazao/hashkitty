import axios from 'axios'
import { ref, computed, inject } from 'vue'
import { defineStore } from 'pinia'
import { useToast } from "vue-toastification"

const toast = useToast()


export const useUserStore = defineStore('user', () => {

    const toast = useToast()
    
    const user = ref(null)

    const userName = computed(() => user.value?.user ?? -1)

    async function loadUser() {
        try {
            const response = await axios.get('profile')
            user.value = response.data
        } catch (customError) {
            if (customError.response && customError.response.status === 422) {
                console.error('Erro 422:', customError.response.data.message);
            } else {
                console.error('Erro inesperado:', customError);
            }
            clearUser();
            throw customError;
        }
    }

    function clearUser() {
        delete axios.defaults.headers.common.Authorization
        sessionStorage.removeItem('token')
        user.value = null
    }     

    async function login(credentials) {
        try {
            const response = await axios.post('login', credentials)
            axios.defaults.headers.common.Authorization = "Bearer " + response.data.token
            return response.data       
        } 
        catch(error) {
            clearUser()   
            toast.error('User credentials are invalid!')    
            return false      
        }
    }

    async function logout () {
        try {
            await axios.post('logout')
            clearUser()
            return true
        } catch (error) {
            return false
        }
    }

    async function restoreToken () {
        let storedToken = sessionStorage.getItem('token')
        if (storedToken) {
            axios.defaults.headers.common.Authorization = "Bearer " + storedToken
            await loadUser()
            return true
        }
        clearUser()
        return false
    }

    return{
        user,
        userName,
        loadUser,
        clearUser,
        login,
        logout,
        restoreToken
    }
})