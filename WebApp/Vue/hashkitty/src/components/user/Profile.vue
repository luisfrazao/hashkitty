<script setup>
import axios from 'axios';
import { ref, computed, onMounted, watch } from 'vue';
import { useUserStore } from '../../stores/user.js'
import { useToast } from "vue-toastification"
import ApexCharts from 'apexcharts';
import VueApexCharts from 'vue3-apexcharts';

const props = defineProps({
  errors: {
    type: Object,
    required: false,
  },
});

const userStore = useUserStore()
const toast = useToast()
const editShow = ref(false)
const saving = ref(false);

const showTotpModal = ref(false)
const qrCodeUrl = ref(null)
const totpCode = ref('');
const totpEnabled = ref(false);
const loading = ref(true);
const confirmationRemoveDialog = ref(null); 

const oldPassword = ref('');
const newPassword = ref('');
const confirmNewPassword = ref('');

const selectedFilter = ref('lastMonth');
const numStats = ref('');
const jobModes = ref([]);
const jobsByAlgorithm = ref([]);
const jobsStatusOverTime = ref([]);

const chartHeight = '100%';
const chartWidth = '100%';

const algorithmsOptions = computed(() => ({
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

const algorithmsSeries = computed(() => jobsByAlgorithm.value.map(item => item.count));

const modesOptions = computed(() => ({
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

const modesSeries = computed(() => jobModes.value.map(item => item.count));

const statusOptions = ref({
  chart: {
    height: 350,
    type: 'heatmap',
    background: 'transparent',
  },
  plotOptions: {
    heatmap: {
      shadeIntensity: 0.5,
      colorScale: {
        ranges: [
          {
            from: 0,
            to: 0,
            name: 'No Jobs',
            color: '#f3f4f5',
          },
          {
            from: 1,
            to: 10,
            name: 'Few Jobs',
            color: '#90EE7E',
          },
          {
            from: 11,
            to: 20,
            name: 'Some Jobs',
            color: '#F9C80E',
          },
          {
            from: 21,
            to: 30,
            name: 'Many Jobs',
            color: '#F86624',
          },
          {
            from: 31,
            to: 100,
            name: 'Tons of Jobs',
            color: '#EA3546',
          },
        ],
      },
    },
  },
  dataLabels: {
    enabled: false,
  },
  title: {
    text: 'Job Statuses Over Time',
  },
  xaxis: {
    type: 'datetime',
  },
  theme: {
    mode: 'dark',
  },
});

const statusSeries = ref([]);

async function selectedTimeFilter(){
    try{
        const stats = await axios.get('stats/user',{ params: { time: selectedFilter.value } });
        if (stats.data.data) {
            const data = stats.data.data;
            numStats.value = data.numStats || null;
            jobModes.value = data.jobModes || [];
            jobsByAlgorithm.value = data.jobsByAlgorithm || [];
            jobsStatusOverTime.value = data.jobStatusOverTime || [];
            formatHeatmapData(jobsStatusOverTime.value);
        } else {
            console.error('Total transactions data is undefined or empty.');
        }
    } catch (error) {
        console.error('Error fetching data:', error);
    }
    return selectedFilter.value;
}

const formatHeatmapData = (jobStatusOverTime) => {
  const statuses = ['Running', 'Completed', 'Failed'];
  console.log(jobStatusOverTime);
  const formattedData = statuses.map(status => ({
    name: status,
    data: jobStatusOverTime
      .filter(job => job.status === status)
      .map(job => ({
        x: new Date(job.time).getTime(),
        y: job.count,
      })),
  }));
  statusSeries.value = formattedData;
};

let originalValueStr = ''
const editingUser = ref(Object.assign({},userStore.user) )

const getTotpQrCode = async () => {
  try {
    const response = await axios.post('/profile/totp');
    qrCodeUrl.value = response.data.qrCodeUrl;
  } catch (error) {
    console.error('Failed to fetch TOTP QR Code:', error);
  }
};

const submitTotp = async () => {
  try {
    const response = await axios.post('/profile/totp/verify', { token: totpCode.value });
    if (response.data.valid) {
      totpEnabled.value = true;
      showTotpModal.value = false;
    } else {
      removeTotp();
      alert('Invalid TOTP code');
    }
  } catch (error) {
    console.error('Error verifying TOTP:', error);
  }
};

const removeTotp = async () => {
  try {
    await axios.delete('/profile/totp');
    totpEnabled.value = false;
  } catch (error) {
    console.error('Error removing TOTP:', error);
  }
  confirmationRemoveDialog.value.hide();
};

const confirmRemoveTotp = () => {
  confirmationRemoveDialog.value.show();
};

watch(showTotpModal, (newVal) => {
  if (newVal) {
    getTotpQrCode();
  }
});

const closeModal = () => {
  showTotpModal.value = false;
};

const onModalClose = async () => {
  if (!totpEnabled.value) {
    await removeTotp();
  }
  closeModal();
};

const userTitle = computed(()=>{
  if (!editingUser.value) {
    return ''
  }
  return saving.value ? 'Saving...' : 'Profile of ' + editingUser.value.username;
})

const savePasswordChanges = async () => {
  try {
      if(newPassword.value != confirmNewPassword.value){
        throw e
      }
        await axios.put(`/profile/password`, {
          oldPassword: oldPassword.value,
          newPassword: newPassword.value
        });
        toast.success('User #' + editingUser.value.username + ' has updated their password successfully.');
    } catch (error) {
        console.error('Error password user:', error);
        toast.error('Error password user. Please try again.');
    }
};

const fetchUserProfile = async () => {
  try {
    const response = await axios.get('/profile');
    totpEnabled.value = response.data.totp;
  } catch (error) {
    console.error('Error fetching profile:', error);
  }
  finally {
    loading.value = false;
  }
};

onMounted(async ()=>{
  try {
    if(userStore.user.type == 'user'){
      await selectedTimeFilter();
    }
    await fetchUserProfile();
  } catch (error){
    console.error('Error fetching data:', error)
  }
})

</script>
<template>
    <br>
    <br>
    <form class="row g-3 needs-validation" novalidate>
    <h2 class="mt-5 mb-3">{{ userTitle }}</h2>
    <hr/>
    <div>
      <div class="w-75 pe-4">
        <div class="mb-3 px-1">
            <label for="inputName" class="form-label">Username</label> <br>
            <input
              type="text"
              class="form-control edit_input"
              placeholder="Username"
              disabled
              style="background-color: #3d3939;"
              v-model="editingUser.username"
            />
          </div>
          <div class="mb-3 px-1">
            <label for="inputEmail" class="form-label">Email</label> <br>
            <input
              type="email"
              class="form-control edit_input"
              placeholder="Email"
              disabled
              style="background-color: #3d3939;"
              v-model="editingUser.email"
            />
          </div>
        </div>
      </div>
        <div class="d-flex justify-content-start">
          <button type="button" class="btn btn-outline-secondary px-5 mx-2" v-if="!editShow" data-bs-toggle="modal" data-bs-target="#changePass">Change Password</button>
          <button v-if="loading" class="btn btn-outline-secondary px-5 mx-2" disabled>Loading...</button>
          <template v-else>
          <button v-if="!totpEnabled" type="button" class="btn btn-outline-secondary px-5 mx-2" data-bs-toggle="modal" data-bs-target="#totpModal" @click="showTotpModal = true">Add TOTP</button>
          <button v-if="totpEnabled" type="button" class="btn btn-outline-danger px-5 mx-2" @click="confirmRemoveTotp">Remove TOTP</button>
          </template>
        </div>
        <div class="modal fade" id="totpModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="totpModalLabel" aria-hidden="true" @hide.bs.modal="onModalClose">
        <div class="modal-dialog">
          <div class="modal-content bg-dark">
            <div class="modal-header">
              <h1 class="modal-title fs-5" id="totpModalLabel">Scan QR Code to Add TOTP</h1>
              <button type="button" class="btn-close" style="background-color: lightgray;" data-bs-dismiss="modal" aria-label="Close" @click="onModalClose"></button>
            </div>
            <div class="modal-body">
              <div v-if="qrCodeUrl">
                <img :src="qrCodeUrl" alt="TOTP QR Code">
                <input class="form-control mt-3 edit_input_totp" v-model="totpCode" placeholder="Enter TOTP Code" style="width: 450px;"/>
                <button class="btn btn-outline-secondary mt-3" @click="submitTotp">Submit</button>
              </div>
              <div v-else>
                <p>Loading...</p>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" @click="onModalClose">Close</button>
            </div>
          </div>
        </div>
      </div>
        <div class="modal fade" id="changePass" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="changePassLabel" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content bg-dark">
            <div class="modal-header">
              <h1 class="modal-title fs-5" id="changePassLabel">Change Password</h1>
              <button type="button" class="btn-close" style="background-color: lightgray;" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body">
              <label for="inputEmail" class="form-label">Old Password</label> <br>
                <input
                v-if="!editShow"
                type="password"
                class="form-control edit_pass"
                placeholder="Old Password"
                required
                v-model="oldPassword"
                />
                <br>
              <label for="inputEmail" class="form-label">New Password</label> <br>
                <input
                  v-if="!editShow"
                  type="password"
                  class="form-control edit_pass"
                  placeholder="New Password"
                  required
                  v-model="newPassword"
                  />
                  <br>
              <label for="inputEmail" class="form-label">Confirm New Password</label> <br>
                <input
                  v-if="!editShow"
                  type="password"
                  class="form-control edit_pass"
                  placeholder="Confirm New Password"
                  required
                  v-model="confirmNewPassword"
                />
              <br>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
              <button type="button" class="btn btn-info" @click="savePasswordChanges()">Save Changes</button>
            </div>
          </div>
        </div>
      </div>
      </form>
    <br>
    <div v-if="userStore.user.type == 'user'" class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3">
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
    <div v-if="userStore.user.type == 'user'" class="container-fluid">
      <div class="row">
        <div class="col-md-3">
          <div class="card text-white bg-dark mb-3 text-center" style="max-width: 10rem;">
            <div class="card-header">Total Jobs</div>
            <div class="card-body">
              <h5 class="card-title">{{ numStats.numJobs }}</h5>
            </div>
          </div>
          <div class="card text-white bg-dark mb-3 text-center" style="max-width: 10rem;">
            <div class="card-header">Active Jobs</div>
            <div class="card-body">
              <h5 class="card-title">{{ numStats.numActiveJobs }}</h5>
            </div>
          </div>
          <div class="card text-white bg-dark mb-3 text-center" style="max-width: 10rem;">
            <div class="card-header">Completed Jobs</div>
            <div class="card-body">
              <h5 class="card-title">{{ numStats.numCompletedJobs }}</h5>
            </div>
          </div>
          <div class="card text-white bg-dark mb-3 text-center" style="max-width: 10rem;">
            <div class="card-header">Failed Jobs</div>
            <div class="card-body">
              <h5 class="card-title">{{ numStats.numFailedJobs }}</h5>
            </div>
          </div>
        </div>
        <div class="col-md-9">
          <div class="row mb-3">
            <div class="col-md-6">
              <div id="donutChartModes">
                <vue-apex-charts 
                  type="donut"
                  :options="modesOptions"
                  :series="modesSeries" 
                  height="350"/>
              </div>
            </div>
            <div class="col-md-6">
              <div id="donutChartAlgorithms">
                <vue-apex-charts 
                  type="donut" 
                  :options="algorithmsOptions" 
                  :series="algorithmsSeries" 
                  height="350"/>
              </div>
            </div>
          </div>
          <div class="row">
            <div class="col-md-12">
              <div id="heatmapChart">
                <vue-apex-charts 
                  type="heatmap" 
                  :options="statusOptions" 
                  :series="statusSeries" 
                  height="350"/>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <confirmation-dialog
    ref="confirmationRemoveDialog" 
    confirmationBtn="Remove" 
    msg="Are you sure you want to remove the TOTP?" 
    @confirmed="removeTotp">
  </confirmation-dialog>
</template>
<style>
.edit_input{
    color:lightgray;
    background-color: #3d3939;
    width: 500px;
}
.edit_input:focus {
  background-color: #3d3939;
  outline: none; 
}
.edit_pass{
  color:lightgray !important;
  background-color: #3d3939;
}
.edit_pass::placeholder{
  color: lightgray;
}
.edit_pass:focus {
  background-color: #3d3939;
  outline: none; 
}
.edit_input_totp{
    color:lightgray;
    background-color: #3d3939;
}
.edit_input_totp:focus {
  background-color: #3d3939;
  outline: none; 
}
.edit_input_totp::placeholder {
  color: white;
}
</style>