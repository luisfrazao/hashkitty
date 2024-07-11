<script setup>
import axios from 'axios'
import {ref, watch, onMounted} from 'vue';
import { useToast } from "vue-toastification"


const acceptedNodes = ref([]);
const toast = useToast()
const middlewareInfo = ref(null);
const isLoading = ref(true);

const getMiddlewareInfo = async () => {
  try {
    const response = await axios.get("/middleware");
    middlewareInfo.value = response.data;
    isLoading.value = false; 
  } catch (error) {
    console.error('Error fetching middleware information:', error);
  }
};

const getAcceptedNodes = async () => {
  try {
    const response = await axios.get("nodes");
    const receivedNodes = response.data;

    acceptedNodes.value = receivedNodes;
  } catch (error) {
    console.error('Error fetching accepted nodes:', error);
  }
};

const showDetails = ref(Array(acceptedNodes.value.length).fill(false));

const toggleDetails = (index) => {
  showDetails.value[index] = !showDetails.value[index];
};

const removeNode = async (uuid)=>{
  try {
    await axios.delete(`/node/${uuid}`);
    toast.success("Node successfully Deleted")
    await getAcceptedNodes()
  } catch (error) {
    console.error(`Error accepting middleware with UUID ${uuid}:`, error);
  }
}

watch(getAcceptedNodes, (newVal) => {
  showDetails.value = newVal; 
});

onMounted(async () => {
    await getMiddlewareInfo()
    await getAcceptedNodes()
})

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
      <br>
      <br>
      <div class="d-flex justify-content-center">
        <h1>Manage Nodes</h1>
      </div>
      <br>
      <div v-if="middlewareInfo && middlewareInfo.length > 0 ">
      <div class="d-flex justify-content-center">
        <div class="d-flex flex-column">
          <p> Middleware UUID - {{ middlewareInfo[0].uuid }}</p>
          <p> Middleware Name - {{ middlewareInfo[0].name }}</p>
        </div>
      </div>
      </div>
      <div v-else>
        <div class="d-flex justify-content-center">
          <p>Please add a Middleware to Manage Nodes</p>
        </div>
      </div>
      <br>
      <br>
      <div v-if="middlewareInfo && middlewareInfo.length > 0" class="d-flex justify-content-center">
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
            <tr v-for="(node, index) in acceptedNodes" :key="index">
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
                  <button type="button" @click="removeNode(node.uuid)" class="btn btn-outline-danger">Remove Node</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else></div>
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
  