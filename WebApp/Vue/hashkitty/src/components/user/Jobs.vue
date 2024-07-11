<script setup>
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';

const userJobs = ref([]);
const currentPage = ref(1);
const itemsPerPage = ref(10);
const statusFilter = ref('All');

const fetchUserJobs = async () => {
  try {
    const response = await axios.get('/jobs');
    userJobs.value = response.data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
  }
};

onMounted(fetchUserJobs);

const filteredJobs = computed(() => {
  if (statusFilter.value === 'All') {
    return userJobs.value;
  }
  return userJobs.value.filter(job => job.status === statusFilter.value);
});

const paginatedJobs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredJobs.value.slice(start, end);
});

const totalPages = computed(() => Math.ceil(filteredJobs.value.length / itemsPerPage.value));

const setPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const reversedUserJobs = computed(() => paginatedJobs.value.slice().reverse());

</script>
<template>
  <div>
    <br>
    <br>
    <div class="d-flex justify-content-center">
      <h1>Current User Jobs</h1>
    </div>
    <br>
    <div class="d-flex justify-content-right mb-3">
      <div>
        <label for="statusFilter">Filter by Status:</label>
        <select id="statusFilter" v-model="statusFilter" class="form-select bg-dark text-white form-select-bg-position">
          <option value="All">All</option>
          <option value="Running">Running</option>
          <option value="Completed">Completed</option>
          <option value="Failed">Failed</option>
        </select>
      </div>
    </div>
    <div class="d-flex justify-content-center">
      <table class="table table-dark table-striped">
        <thead>
          <tr>
            <th scope="col">Job ID</th>
            <th scope="col">Description</th>
            <th scope="col">Status</th>
            <th scope="col">Statistics</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(job, index) in reversedUserJobs" :key="index">
            <td>{{ job.id }}</td>
            <td>{{ job.description }}</td>
            <td>{{ job.status }}</td>
            <td>
              <router-link class="btn btn-outline-info" :to="{ name: 'JobStatistics', params: { id: job.id } }"
                :class="{ active: $route.name === 'JobStatistics' && $route.params.id == job.id }">
                <i class="bi bi-graph-up"></i>
              </router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="d-flex justify-content-between">
      <button class="btn btn-outline-secondary" @click="setPage(currentPage - 1)" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button class="btn btn-outline-secondary" @click="setPage(currentPage + 1)" :disabled="currentPage === totalPages">Next</button>
    </div>
  </div>
</template>

<style>
th, td {
  width: 25%;
}
</style>
