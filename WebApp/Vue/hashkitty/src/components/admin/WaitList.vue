<script setup>
import axios from 'axios'
import {ref, onMounted, inject} from 'vue';
import { useToast } from "vue-toastification"

const socket = inject("socket")


const toast = useToast()
const pendentNodes = ref([]);
const pendentMiddleware = ref([]);
const acceptedMiddleware = ref([]);
const password = ref();
const isLoading = ref(true);

const pendentNodesFiltered = async () => {
  try {
    const response = await axios.get("pendingNodes");
    const receivedNodes = response.data;
    const pendingNodesArray = receivedNodes.filter(node => node.validation === 'Pending');
    pendentNodes.value = pendingNodesArray;
  } catch (error) {
    console.error('Error fetching pendent nodes:', error);
    return []; 
  }
};

const fetchPendentMiddleware = async () => {
  try {
    const response = await axios.get("middleware");
    pendentMiddleware.value = response.data.filter(middleware => middleware.status == 'Pending');
    acceptedMiddleware.value = response.data.filter(middleware => middleware.status == 'Accepted');
    isLoading.value = false; 
  } catch (error) {
    console.error('Error fetching pendent middleware:', error);
    pendentMiddleware.value = []; 
    isLoading.value = false; 
  }
};

onMounted(async () => {
  await fetchPendentMiddleware();
  await pendentNodesFiltered();

  socket.emit('authenticate', sessionStorage.getItem('token'));

  socket.on('newNode', function (node_data) {
    if(node_data.validation == "Pending"){
      pendentNodes.value.push(node_data)
    }
  });
});

const acceptNode = async (uuid, index) => {
  try {
    await axios.put(`/node/${uuid}/validation`, { validation: 'Accepted' });
    await pendentNodesFiltered();
    toggleDetails(index);
  } catch (error) {
    console.error(`Error accepting node with UUID ${uuid}:`, error);
  }
};

const rejectNode = async (uuid, index) => {
  try {
    await axios.put(`/node/${uuid}/validation`, { validation: 'Rejected' });
    await pendentNodesFiltered();
    toggleDetails(index); // Hide details after rejecting
  } catch (error) {
    console.error(`Error rejecting node with UUID ${uuid}:`, error);
  }
};

const acceptMiddleware = async (uuid, index) => {
  try {
    const response = await axios.put(`/middleware/${uuid}`, { status: 'Accepted' });
    password.value = response.data.password;
    toast.success('Middleware successfully Accepted');
    await fetchPendentMiddleware();
    toggleDetails(index); // Hide details after accepting
  } catch (error) {
    console.error(`Error accepting middleware with UUID ${uuid}:`, error);
  }
};

const rejectMiddleware = async (uuid, index) => {
  try {
    await axios.put(`/middleware/${uuid}`, { status: 'Rejected' });
    await fetchPendentMiddleware();
    toggleDetails(index); 
  } catch (error) {
    console.error(`Error rejecting middleware with UUID ${uuid}:`, error);
  }
};

const toggleDetails = (index) => {
  showDetails.value[index] = !showDetails.value[index];
};

const showDetails = ref(Array(pendentNodes.value.length).fill(false));


const copyClipboard = () =>{
  try{
    navigator.clipboard.writeText(password.value)
    toast.success("Copied to Clipboard")
  }
  catch(e){
    throw e
  }
}
</script>
<template>
  <div v-if="isLoading">
    <div class="d-flex justify-content-center align-items-center flex-column">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
    </div>
  </div>

  <div v-else>

  <div v-if="pendentMiddleware.length == 0 && acceptedMiddleware.length == 0">
    <br>
    <br>
    <div class="d-flex justify-content-center align-items-center flex-column">
      <h1>No Pending Middlewares</h1>
      <br>
      <h3>Please Add a Middleware</h3>
    </div>
  </div>
    <div v-if="pendentMiddleware.length > 0  ">
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <h1>Handle Received Middlewares</h1>
      </div>
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <table class="table table-dark table-striped">
          <thead>
            <tr>
              <th scope="col">UUID</th>
              <th scope="col">Name</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(middleware, index) in pendentMiddleware" :key="index">
              <td>{{ middleware.uuid }}</td>
              <td>{{ middleware.name }}</td>
              <td class="details-column">
                <button @click="toggleDetails(index)" type="button" class="btn btn-outline-secondary" data-bs-toggle="button">Toggle Details</button>
                <div v-if="showDetails[index]" class="details-content">
                  <p>Additional Details:</p>
                  <ul>
                    <li>Status: {{ middleware.status }}</li>
                  </ul>
                  <button @click="acceptMiddleware(middleware.uuid, index)" type="button" class="btn btn-outline-success me-2"
                    data-bs-toggle="modal" data-bs-target="#myModal">Accept</button>
                  <button @click="rejectMiddleware(middleware.uuid, index)" type="button" class="btn btn-outline-danger">Deny</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="acceptedMiddleware.length > 0">
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <h1>Handle received Nodes</h1>
      </div>
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <table class="table table-dark table-striped">
          <thead>
            <tr>
              <th scope="col">UUID</th>
              <th scope="col">CPU</th>
              <th scope="col">Ram</th>
              <th scope="col">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(node, index) in pendentNodes" :key="index">
              <td>{{ node.uuid }}</td>
              <td>{{ node.cpu }}</td>
              <td>{{ node.ram }}</td>
              <td class="details-column">
                <button @click="toggleDetails(index)" type="button" class="btn btn-outline-secondary" data-bs-toggle="button">Toggle Details</button>
                <div v-if="showDetails[index]" class="details-content">
                  <p>Additional Details:</p>
                  <ul>
                    <li>Status: {{ node.status }}</li>
                  </ul>
                  <button @click="acceptNode(node.uuid, index)" type="button" class="btn btn-outline-success me-2">Accept</button>
                  <button @click="rejectNode(node.uuid, index)" type="button" class="btn btn-outline-danger">Deny</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="modal fade" id="myModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog" role="document">
        <div class="modal-content bg-dark">
          <div class="modal-header">
            <h5 class="modal-title">Middleware Password</h5>
            <button type="button" class="btn-close" style="background-color: lightgray;" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div v-if="!password">
              <div class="text-center">
                <div class="spinner-border text-light" role="status">
                  <span class="visually-hidden">Loading Key ...</span>
                </div>
              </div>
            </div>
            <div v-else class="form-floating mb-3">
              <br>
              <textarea class="form-control" id="passwordInput" style="color: lightgray; background-color: #3d3939; resize: none; height: 100px;" v-model="password" disabled></textarea>
              <br>
              <div class="d-flex justify-content-center">
                <button class="btn btn-outline-secondary" type="button" @click="copyClipboard()">
                  <i class="bi bi-clipboard"></i> Copy to Clipboard
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
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
  