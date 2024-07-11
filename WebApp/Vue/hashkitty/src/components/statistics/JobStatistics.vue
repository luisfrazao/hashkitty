<script setup>
import axios from 'axios';
import { ref, computed, onMounted, inject } from 'vue';
import { useToast } from "vue-toastification";
import { useRouter } from 'vue-router';
import VueApexCharts from 'vue3-apexcharts';

const route = useRouter().currentRoute.value;
const toast = useToast();
const jobId = ref(null);
const jobDetails = ref(null);
const hashListDetails = ref(null);
const currentPage = ref(1);
const itemsPerPage = ref(20);
const crackingAnimation = ref('Cracking');
const selectedFilter = ref('All');
const filterOptions = ['All', 'Cracked', 'Uncracked'];

const socket = inject("socket");

const filteredHashes = computed(() => {
  if (!hashListDetails.value) return [];

  return hashListDetails.value.list.split(',').filter(hash => {
    const password = getPasswordForHash(hash);
    if (selectedFilter.value === 'Cracked') {
      return password !== crackingAnimation.value;
    } else if (selectedFilter.value === 'Uncracked') {
      return password === crackingAnimation.value;
    }
    return true;
  });
});

const passwordStats = computed(() => {
  const stats = {
    justChars: 0,
    justNumbers: 0,
    justSpecialChars: 0,
    charsAndNumbers: 0,
    charsAndSpecialChars: 0,
    allThree: 0,
    crackedPasswordsLength: [],
    passwordLengthCounts: {}
  };

  if (jobDetails.value && jobDetails.value.result) {
    const passwords = jobDetails.value.result.split(',').map(item => item.split(':')[1]); // Log passwords for debugging
    passwords.forEach(password => {
      const hasChars = /[a-zA-Z]/.test(password);
      const hasNumbers = /\d/.test(password);
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (hasChars && !hasNumbers && !hasSpecialChars) stats.justChars++;
      else if (!hasChars && hasNumbers && !hasSpecialChars) stats.justNumbers++;
      else if (!hasChars && !hasNumbers && hasSpecialChars) stats.justSpecialChars++;
      else if (hasChars && hasNumbers && !hasSpecialChars) stats.charsAndNumbers++;
      else if (hasChars && !hasNumbers && hasSpecialChars) stats.charsAndSpecialChars++;
      else if (hasChars && hasNumbers && hasSpecialChars) stats.allThree++;

      const length = password.length;
      stats.crackedPasswordsLength.push(length);
      if (stats.passwordLengthCounts[length]) {
        stats.passwordLengthCounts[length]++;
      } else {
        stats.passwordLengthCounts[length] = 1;
      }
    });
  }

  return stats;
});

const barChartOptions = computed(() => {
  const lengthCategories = Object.keys(passwordStats.value.passwordLengthCounts).sort((a, b) => a - b);
  const lengthCounts = lengthCategories.map(length => passwordStats.value.passwordLengthCounts[length]);

  return {
    chart: {
      type: 'bar',
      background: 'transparent',
    },
    series: [{
      name: 'Number of passwords',
      data: lengthCounts
    }],
    xaxis: {
      categories: lengthCategories
    },
    theme: {
      mode: 'dark'
    }
  };
});

const donutChartOptions = computed(() => ({
  chart: {
    type: 'donut',
    background: 'transparent',
  },
  series: [
    passwordStats.value.justChars,
    passwordStats.value.justNumbers,
    passwordStats.value.charsAndNumbers,
    passwordStats.value.charsAndSpecialChars,
    passwordStats.value.allThree
  ],
  labels: ['Just Chars', 'Just Numbers', 'Chars & Numbers', 'Chars & Special Chars', 'All Three'],
  theme: {
    mode: 'dark'
  }
}));

const fetchData = async () => {
  jobId.value = route.params.id;
  try {
    const response = await axios.get(`/job/${jobId.value}`);
    jobDetails.value = response.data;
    startCrackingAnimation();
    const responseH = await axios.get(`/hashList/${jobDetails.value.hash_list_id}`);
    hashListDetails.value = responseH.data;
  } catch (error) {
    console.error('Error fetching jobs:', error);
  }
  socket.emit('authenticate', sessionStorage.getItem('token'));

  socket.on('jobUpdate', function (job_data) {
    if (job_data.jobId == jobId.value) {
      jobDetails.value.status = job_data.status;
      if(job_data.updatedResult){
        jobDetails.value.result = job_data.totalResult;
      }
    }
  });
};

onMounted(() => {
  fetchData();
});


const findWifiHash = (hash) => {
  if (hash){
    let resultPairs = jobDetails.value.result.split(',').map(item => item.split(':'));
    
    const modifiedResultPairs = resultPairs.map(subArray => {
      const modifiedSubArray = [...subArray];
      modifiedSubArray[0] = modifiedSubArray[0].split('*')[1];
      return modifiedSubArray;
    });

    let password = null;
    for (const subArray of modifiedResultPairs) {
      if (hash.includes(subArray[0])) {
        password = subArray[1];
      }
    }
    if (password) {
      return password;
    }
    return crackingAnimation.value;
  }
};

const getPasswordForHash = (hash) => {
  if (jobDetails.value && jobDetails.value.result) {
    if (hashListDetails.value.algorithm === 'WPA2') {
      return findWifiHash(hash);
    }
    const lowerCaseHash = hash.toLowerCase();
    const resultPairs = jobDetails.value.result.split(',').map(item => item.split(':'));
    const hashPair = resultPairs.find(pair => pair[0].toLowerCase() === lowerCaseHash);
    if (hashPair) {
      return hashPair[1];
    }
  }
  return crackingAnimation.value;
};

const progressPercentage = computed(() => {
  if (jobDetails.value && jobDetails.value.result && hashListDetails.value) {
    const totalHashes = hashListDetails.value.list.split(',').length;
    const crackedHashes = jobDetails.value.result.split(',').length;
    return ((crackedHashes / totalHashes) * 100).toFixed(1);
  }
  return 0;
});

const startCrackingAnimation = () => {
  if (jobDetails.value && jobDetails.value.status == 'Running') {
    let dotCount = 0;
    setInterval(() => {
      dotCount = (dotCount + 1) % 4;
      crackingAnimation.value = 'Cracking' + '.'.repeat(dotCount);
    }, 1000);
  } else {
    crackingAnimation.value = 'Failed to Crack';
  }
};

const paginatedHashes = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value;
  const end = start + itemsPerPage.value;
  return filteredHashes.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredHashes.value.length / itemsPerPage.value);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
  }
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
  }
};

const downloadCSV = () => {
  let csvContent = "Hash,Password\n";
  filteredHashes.value.forEach(hash => {
    const password = getPasswordForHash(hash);
    csvContent += `${hash},${password}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `cracked-passwords-${jobDetails.value.description}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

</script>

<template>
  <br>
  <br>
  <h2 class="mt-5 mb-3">Job: {{ jobDetails ? jobDetails.description : '' }}</h2>
  <hr/>
  <div class="mt-5 mb-3" v-if="hashListDetails">
    <div class="d-flex justify-content-between align-items-center">
      <div>
        <h3> Algorithm Used: {{ hashListDetails.algorithm }}</h3>
        <h4> Status: {{ jobDetails.status  }} </h4>
      </div>
      <button class="btn btn-outline-secondary" v-if="jobDetails.status === 'Completed'" @click="downloadCSV">Download CSV</button>
    </div>
    <br>
    <div>
      <label for="filter">Filter hashes:</label>
      <select id="filter" v-model="selectedFilter" class="form-select bg-dark text-white form-select-bg-position">
        <option value="All" selected>Show all</option>
        <option value="Cracked">Show only cracked</option>
        <option value="Uncracked">Show only uncracked</option>
      </select>
    </div>
    <br>
    <div>
      <label> Current Progress: {{ progressPercentage }}%</label>
      <div class="progress" role="progressbar" aria-label="Animated striped example" :aria-valuenow="progressPercentage" aria-valuemin="0" aria-valuemax="100">
        <div class="progress-bar progress-bar-striped bg-info progress-bar-animated" :style="{ width: progressPercentage + '%' }"></div>
      </div>
    </div>
    <br>
    <table class="table table-dark table-striped" >
      <thead>
        <tr>
          <th scope="col" style="width: 50%">Hash</th>
          <th scope="col" style="width: 50%">Password</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(hash, index) in paginatedHashes" :key="index">
          <td class="table-cell-scrollable">{{ hash }}</td>
          <td class="table-cell-scrollable">{{ getPasswordForHash(hash) }}</td>
        </tr>
      </tbody>
    </table>
    <div class="d-flex justify-content-between">
      <button class="btn btn-outline-secondary" @click="previousPage" :disabled="currentPage === 1">Previous</button>
      <span>Page {{ currentPage }} of {{ totalPages }}</span>
      <button class="btn btn-outline-secondary" @click="nextPage" :disabled="currentPage === totalPages">Next</button>
    </div>
    <br>
    <div class="d-flex justify-content-between">
      <div class="chart-container bg-dark card" style="width: 48%">
        <h3 style="color: lightgray">Password Lengths</h3>
        <br>
        <VueApexCharts type="bar" :options="barChartOptions" :series="barChartOptions.series" />
      </div>
      <div class="chart-container bg-dark card" style="width: 48%">
        <h3 style="color: lightgray">Password Characteristics</h3>
        <div style="width: 98%; margin: 0 auto;">
          <VueApexCharts type="donut" :options="donutChartOptions" :series="donutChartOptions.series" />
        </div>
      </div>
    </div>
  </div>
</template>


<style>
body {
  overflow-x: hidden; /* Prevent horizontal scrolling */
}
.chart-container {
  background-color: transparent; /* Assuming the normal background is transparent */
  padding: 10px;
  border-radius: 5px;
}
.table-cell-scrollable {
  max-width: 200px;
  overflow-x: auto;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.table {
  table-layout: fixed;
  width: 100%;
}
.table .table-dark.table-striped th,
.table .table-dark.table-striped td {
  overflow: hidden;
}
</style>
