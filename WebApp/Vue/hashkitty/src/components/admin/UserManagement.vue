<script setup>
import axios from 'axios'
import {ref, onMounted} from 'vue';
import { useToast } from "vue-toastification"



const users = ref([]);
const toast = useToast()

const getUsers = async () => {
  try {
    const response = await axios.get("users");
    const receivedUsers = response.data.users;

    users.value = receivedUsers;
  } catch (error) {
    console.error('Error fetching accepted nodes:', error);
  }
};

onMounted(async () => {
    await getUsers()
})

const removeUser = async (id)=>{
  try {    
    await axios.delete(`profile/${id}`);
    toast.success("User successfully Deleted")
    await getUsers()
  } catch (error) {
    console.error(`Error accepting middleware with Id ${id}:`, error);
  }
}

</script>
<template>
    <div>
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <h1>Manage Users</h1>
      </div>
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <table class="table table-dark table-striped">
          <thead>
            <tr>
              <th scope="col">Username</th>
              <th scope="col">Email</th>
              <th scope="col">User Type</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(user, index) in users" :key="index">
              <td>{{ user.username }}</td>
              <td>{{ user.email }}</td>
              <td>{{ user.user_type }}</td>
              <td class="details-column">
                <button type="button" @click="removeUser(user.id)" class="btn btn-outline-danger">Remove User</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>

  
  <style>
.details-column {
  position: relative; 
}
.details-content {
  position: absolute;
  top: 100%; 
  left: 0;
  width: 100%; 
  padding: 10px;
  background-color: #343a40; 
  color: #ffffff; 
  z-index: 1; 
}
th, td {
  width: 25%;
}
</style>
  