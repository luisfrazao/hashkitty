<script setup>
import axios from 'axios';
import { useToast } from 'vue-toastification';
import { ref,computed, onMounted  } from 'vue';
import ApexCharts from 'apexcharts';
import VueApexCharts from 'vue3-apexcharts';


const selectedFilter=ref('lastMonth');
const numNodes=ref('0');
const numUpNodes=ref('0');
const numGpus=ref('0');
const numWorkingGpus=ref('0');
const numJobs=ref('0');
const numActiveJobs=ref('0');
const numCompletedJobs=ref('0');
const numFailedJobs=ref('0');
const jobModes = ref([]);
const newNodesByDay = ref([]);
const completedJobsByDay = ref([]);
const failedJobsByDay = ref([]);
const jobsByAlgorithm = ref([]);

const chartHeight = '100%';
const chartWidth = '100%';

async function selectedTimeFilter(){
    try{
        const stats = await axios.get('stats/',{ params: { time: selectedFilter.value } });
        console.log(selectedFilter.value)
        if (stats.data.data) {
            const data = stats.data.data;
            console.log(data);
            jobModes.value = data.jobModes || [];
            newNodesByDay.value = data.newNodesByDay || [];
            completedJobsByDay.value = data.completedJobsByDay || [];
            failedJobsByDay.value = data.failedJobsByDay || [];
            jobsByAlgorithm.value = data.jobsByAlgorithm || [];
        } else {
            console.error('Total transactions data is undefined or empty.');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    return selectedFilter.value;
}

const jobsByModeOptions = computed(() => ({
  chart: {
    type: 'donut',
    height: chartHeight,
    width: chartWidth,
    background: 'transparent',
  },
  labels: jobModes.value.map(item => item.mode),
  theme: {
    mode: 'dark',
  },
}));

const jobsByModeSeries = computed(() => jobModes.value.map(item => item.count));

const newNodesPerDayOptions = computed(() => ({
  chart: {
    type: 'bar',
    height: chartHeight,
    width: chartWidth,
    background: 'transparent',
    toolbar: {
      show: true,
    },
  },
  xaxis: {
    categories: newNodesByDay.value.map(item => item.time),
  },
  theme: {
    mode: 'dark',
  },
}));

const newNodesPerDaySeries = computed(() => [{
  name: 'New Nodes',
  data: newNodesByDay.value.map(item => item.count)
}]);

const jobsStatusPerDayOptions = computed(() => {
  const allTimes = [...new Set([...failedJobsByDay.value.map(item => item.time), ...completedJobsByDay.value.map(item => item.time)])].sort();
  return {
    chart: {
      type: 'area',
      height: chartHeight,
      width: chartWidth,
      background: 'transparent',
      toolbar: {
        show: true,
      },
    },
    xaxis: {
      categories: allTimes,
    },
    theme: {
      mode: 'dark',
    },
  };
});

const jobsStatusPerDaySeries = computed(() => {
  const allTimes = [...new Set([...failedJobsByDay.value.map(item => item.time), ...completedJobsByDay.value.map(item => item.time)])].sort();

  const completedJobsData = allTimes.map(time => {
    const job = completedJobsByDay.value.find(item => item.time === time);
    return job ? job.count : 0;
  });

  const failedJobsData = allTimes.map(time => {
    const job = failedJobsByDay.value.find(item => item.time === time);
    return job ? job.count : 0;
  });

  return [
    {
      name: 'Completed Jobs',
      data: completedJobsData
    },
    {
      name: 'Failed Jobs',
      data: failedJobsData
    }
  ];
});


const jobsByAlgorithmOptions = computed(() => ({
    chart: {
        type: 'donut',
        height: chartHeight,
        width: chartWidth,
        background: 'transparent',
    },
    labels: jobsByAlgorithm.value.map(item => item.algorithm),
    theme: {
        mode: 'dark',
    },
}));

const jobsByAlgorithmSeries = computed(() => jobsByAlgorithm.value.map(item => item.count));

onMounted(async () => {
  try {
    const stats = await axios.get('stats/',{'time':selectedFilter.value});
    if (stats.data.data) {
        const data = stats.data.data;
        numNodes.value = data.numStats.numNodes || "0";
        numUpNodes.value = data.numStats.numUpNodes || "0";
        numGpus.value = data.numStats.numGpus || "0";
        numWorkingGpus.value = data.numStats.numWorkingGpus || "0";
        numJobs.value = data.numStats.numJobs || "0";
        numActiveJobs.value = data.numStats.numActiveJobs || "0";
        numCompletedJobs.value = data.numStats.numCompletedJobs || "0";
        numFailedJobs.value = data.numStats.numFailedJobs || "0";
        jobModes.value = data.jobModes || [];
        newNodesByDay.value = data.newNodesByDay || [];
        completedJobsByDay.value = data.completedJobsByDay || [];
        failedJobsByDay.value = data.failedJobsByDay || [];
        jobsByAlgorithm.value = data.jobsByAlgorithm || [];
    } else {
      console.error('Total transactions data is undefined or empty.');
    }
  } catch (error) {
    console.error('Error fetching data:', error);
  }
});

</script>   
<template>
    <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3">
        <h1 class="h2">Dashboard</h1>
    </div>
    <hr>
    <div class="row">
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Nodes</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numNodes }}</span></h2>
                </div>
            </div>
        </div>
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Up Nodes</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numUpNodes }}</span></h2>
                </div>
            </div>
        </div>
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of GPUs</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numGpus }}</span></h2>
                </div>
            </div>
        </div>
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Working GPUs</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numWorkingGpus }}</span></h2>
                </div>
            </div>
        </div>
    </div>
    <div class="row mt-4">
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Jobs</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numJobs }}</span></h2>
                </div>
            </div>
        </div>
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Active Jobs</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numActiveJobs }}</span></h2>
                </div>
            </div>
        </div>
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Completed Jobs</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numCompletedJobs }}</span></h2>
                </div>
            </div>
        </div>
        <div class="col-sm-3 mb-3 mb-sm-0">
            <div class="card bg-dark text-white text-center">
                <div class="card-body">
                    <h5 class="card-title">Number of Failed Jobs</h5>
                    <br>
                    <h2><span class="badge bg-dark">{{ numFailedJobs }}</span></h2>
                </div>
            </div>
        </div>
    </div>
    <br>
    <div>
        <div class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3">
            <h1 class="h2">Statistics</h1>
            <div class="mb-3">
                <label for="timeFilterSelect" class="form-label">Select Time Filter:</label>
                <div style="width: 150px;">
                    <select id="timeFilterSelect" v-model="selectedFilter" class="form-select form-select-sm bg-dark text-white" @change="selectedTimeFilter">
                        <option :value="'today'">Today</option>
                        <option :value="'last7Days'">Last 7 Days</option>
                        <option :value="'lastMonth'">Last Month</option>
                        <option :value="'last3Months'">Last 3 Months</option>
                    </select>
                </div>
            </div>
        </div>
        <hr>
        <div class="row mt-4">
            <div class="col-sm-6">
                <div class="card bg-dark text-white text-center">
                    <div class="card-body">
                        <h5 class="card-title">Jobs by Mode</h5>
                        <vue-apex-charts
                            :options="jobsByModeOptions"
                            :series="jobsByModeSeries"
                            type="donut"
                            height="350px"
                            width="100%"
                        />
                    </div>
                </div>
            </div>
            <div class="col-sm-6">
                <div class="card bg-dark text-white text-center">
                    <div class="card-body">
                        <h5 class="card-title">Jobs by Algorithm</h5>
                        <vue-apex-charts
                            :options="jobsByAlgorithmOptions"
                            :series="jobsByAlgorithmSeries"
                            type="donut"
                            height="350px"
                            width="100%"
                        />
                    </div>
                </div>
            </div>
        </div>
        <div class="row mt-4">
            <div class="col-sm-6">
                <div class="card bg-dark text-white text-center">
                    <div class="card-body">
                    <h5 class="card-title">Jobs Status per Day</h5>
                    <vue-apex-charts
                        :options="jobsStatusPerDayOptions"
                        :series="jobsStatusPerDaySeries"
                        type="area"
                        height="350px"
                        width="100%"
                    />
                    </div>
                </div>
            </div>
            <div class="col-sm-6">
                <div class="card bg-dark text-white text-center">
                    <div class="card-body">
                    <h5 class="card-title">New Nodes per Day</h5>
                    <vue-apex-charts
                        :options="newNodesPerDayOptions"
                        :series="newNodesPerDaySeries"
                        type="bar"
                        height="350px"
                        width="100%"
                    />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<style>
.form-select-bg-position {
  width: 250px;
}
.form-selectmultiple-bg-position{
    width: 650px;
    height: 150px;
}
.move-input{
    margin-right: 350px;
    width: 300px;
}
.move-textarea{
    width: 650px;
    height: 200px;
}
.algorithms{
    display: flexbox;
    flex-direction: row;
}
</style>