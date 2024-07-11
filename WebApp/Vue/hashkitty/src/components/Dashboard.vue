<script setup>
import axios from 'axios';
import { ref, watch,onMounted,computed,inject } from 'vue';
import { useToast } from "vue-toastification"
import { useRouter } from 'vue-router'
import * as bootstrap from 'bootstrap';

const socket = inject("socket")


const toast = useToast()
const router = useRouter()

const radioOption = ref('file');
const ruleOption = ref('file');
const acceptedNodes = ref([]);
const selectedDevices  = ref([]);
const jobDescription = ref('');
const selectedAlgorithm = ref('MD5');
const selectedMode = ref('D');
const selectedTime = ref('1h');
const selectedDictionary = ref([])
const selectedRule = ref([])
const selectedMask = ref('1');
const selectAll = ref(false);

const dictionaries = ['ASLM', 'HK', 'RockYou','Crackstation',"Hashkiller","5M","PTdicio"];

const file = ref(null);
const fileContent = ref('');

const ruleFile = ref(null);
const ruleFileContent = ref('');

const textSent = ref('');

const filteredNodes = computed(() => {
  if (selectedDevices.value.length == 0 || selectedMode.value != 'C') {
    return acceptedNodes.value;
  } else {
    return acceptedNodes.value.filter(node => {
      if (node.status != 'Up') {
        return false;
      }

      if (!node.gpus || node.gpus.length == 0) {
        return node.cpu_status != 'Working';
      }

      node.gpus = node.gpus.filter(gpu => gpu.status != 'Working'); 
      return node.gpus.length > 0;
      });
  }
});

onMounted(() => {
  const popoverTriggerList = document.querySelectorAll('.popover-dismiss');
  popoverTriggerList.forEach(popoverTriggerEl => {
    new bootstrap.Popover(popoverTriggerEl, {
      trigger: 'focus',
      html: true,
      title: popoverTriggerEl.getAttribute('data-bs-title'),
      content: popoverTriggerEl.getAttribute('data-bs-content')
    });
  });

  socket.emit('authenticate', sessionStorage.getItem('token'));

  socket.on('nodeUpdate', function (node_data) {
    acceptedNodes.value = [];
    node_data.forEach(node => {
      if(node.status == "Up"){
        acceptedNodes.value.push(node);
      }
    });
  });
  getAcceptedNodes();
});

const getAcceptedNodes = async () => {
  try {
    const response = await axios.get("nodes");
    const receivedNodes = response.data;

    const filteredNodes = receivedNodes.filter(node => {
      if (node.status != 'Up') {
        return false;
      }

      if (!node.gpus || node.gpus.length == 0) {
        return node.cpu_status != 'Working';
      }

      node.gpus = node.gpus.filter(gpu => gpu.status != 'Working'); 
      return node.gpus.length > 0;
    });

    acceptedNodes.value = filteredNodes;
  } catch (error) {
    console.error('Error fetching accepted nodes:', error);
  }
};

watch(getAcceptedNodes, (newVal) => {
  showDetails.value = newVal; 
});

watch(selectedDictionary, () => {
  selectAll.value = selectedDictionary.value.length === dictionaries.length;
});

watch(selectedMode, () => {
  selectedDictionary.value = [];
  selectedRule.value = [];
  selectedDevices.value = [];
  selectAll.value = false;
});

const setOption = (option) => {
  radioOption.value = option;
};  

const setRuleOption = (option) => {
  if(option == "oneRule"){
    selectedRule.value = ['OneRuleToRuleThemAll']
  }
  ruleOption.value = option;
};

const handleFileChange = (event) => {
  const uploadedFile = event.target.files[0];
  file.value = uploadedFile;

  if (uploadedFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      fileContent.value = e.target.result;
    };
    reader.readAsText(uploadedFile);
  }
};

const handleRuleFileChange = (event) => {
  const uploadedFile = event.target.files[0];
  ruleFile.value = uploadedFile;

  if (uploadedFile) {
    const reader = new FileReader();
    reader.onload = (e) => {
      ruleFileContent.value = e.target.result;
    };
    reader.readAsText(uploadedFile);
  }
};

const sendWork = async () => {
  if (fileContent.value.length == 0 && textSent.value.length == 0){
    toast.error('Please insert some hashes or files before sending a work to be done');
    return
  }
  if (selectedRule.value.length == 0 && selectedMode.value == 'R' && ruleOption.value === 'checkboxes'){
    toast.error('Please select at least one Rule or create your own');
    return;
  }
  if (selectedDictionary.value.length == 0 &&  selectedMode.value != 'B'){
    toast.error('Please select at least one Dictionary');
    return;
  }
  if (selectedDevices.value.length == 0) {
    toast.error('Please select at least one GPU to send work.');
    return; 
  }
  if (selectedDictionary.value.length != 2 && selectedMode.value == 'C'){
      toast.error('Only 2 dictionaries can be combined');
      return; 
    }
  if (jobDescription.value == ""){
    toast.error('Description can`t be empty');
    return; 
  }
  let payloadHash = {}
  if (radioOption.value == 'file') {
    if (fileContent.value.endsWith('\n')) {
      fileContent.value = fileContent.value.slice(0, -1);
    }
    fileContent.value = fileContent.value.replace(/\n/g, ',').replace(/\s/g, '');
    payloadHash = {
    algorithm: selectedAlgorithm.value,
    hashlist: fileContent.value
  };
  } else {
    textSent.value = textSent.value.replace(/\n/g, ',').replace(/\s/g, '');
    payloadHash = {
    algorithm: selectedAlgorithm.value,
    hashlist: textSent.value
  };}

  try {
    const response = await axios.post('/hashlist', payloadHash);
    let payloadJobs= {}
    let rulesPayload = selectedRule.value;
    if (ruleOption.value == 'file' && ruleFileContent.value.length > 0) {
      if (ruleFileContent.value.endsWith('\n')) {
        ruleFileContent.value = ruleFileContent.value.slice(0, -1);
      }
      rulesPayload  = ruleFileContent.value.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
    }
    if (selectedMode.value == "R"){
      payloadJobs = {
      algorithm: selectedAlgorithm.value,
      mode: selectedMode.value,
      lists: selectedDictionary.value,
      mask: selectedMask.value,
      rules: rulesPayload,
      hash_list_id: response.data.id,
      description: jobDescription.value,
      gpus: selectedDevices.value,
      runtime: selectedTime.value
     }
    }
    else if(selectedMode.value == "B"){
      payloadJobs = {
      algorithm: selectedAlgorithm.value,
      mode: selectedMode.value,
      hash_list_id: response.data.id,
      description: jobDescription.value,
      gpus: selectedDevices.value,
      runtime: selectedTime.value
     }
    }
    else {
      payloadJobs = {
      algorithm: selectedAlgorithm.value,
      mode: selectedMode.value,
      lists: selectedDictionary.value,
      hash_list_id: response.data.id,
      description: jobDescription.value,
      gpus: selectedDevices.value,
      runtime: selectedTime.value
    }
    }
    console.log(rulesPayload)
    const resJob = await axios.post('/job', payloadJobs)
    if (resJob.data.message){
      toast.error(resJob.data.message)
    }
    
    toast.success("Job created successfully")
    router.push({ name: 'JobStatistics', params: { id: resJob.data.id } });
  } catch (error) {
    console.error('Error sending work:', error);
    toast.error('Error in sending work:', error);
  }
}

const isDictionaryDisabled = (dictionary) => {
  return selectedDictionary.value.length >= 2 && selectedMode.value === 'C' && !selectedDictionary.value.includes(dictionary);
};

const toggleAll = () => {
  if (selectAll.value) {
    selectedDictionary.value = [...dictionaries];
  } else {
    selectedDictionary.value = [];
  }
};

const handleAccordionClick = (event, index) => {
  if (event.target.tagName !== 'INPUT') {
    event.stopPropagation();
    const collapseElementId = 'flush-collapse-' + index;
    const collapseElement = document.getElementById(collapseElementId);
    if (collapseElement) {
      const bootstrapCollapse = new bootstrap.Collapse(collapseElement, {
        toggle: true
      });
      bootstrapCollapse.toggle();
    } else {
      console.error(`Collapse element with ID ${collapseElementId} not found`);
    }
  }
};

</script>
<template>
  <div>
    <br>
    <div class="d-flex justify-content-center">
      <h1>Let's see your security</h1>
    </div>
    <br>
    <div class="d-flex justify-content-center">
      <div class="algorithms mx-5">
        <label class="d-flex">Supported Algorithms</label>
        <select class="form-select bg-dark text-white form-select-bg-position" aria-label="Default select example" v-model="selectedAlgorithm">
          <option value="MD5" selected>MD5</option>
          <option value="SHA-256">SHA-256</option>
          <option value="WPA2">WPA2</option>
        </select>
      </div>
      <div class="algorithms mx-5">
        <label class="d-flex">Supported modes</label> 
        <div class="d-flex align-items-center">
          <select class="form-select bg-dark text-white form-select-bg-position" aria-label="Default select example" v-model="selectedMode">
                    <option value="D" selected>Dictionary</option>
                    <option value="R">Dictionary with Rules</option>
                    <option value="C">Dictionary with Combinator</option>
                    <option value="B">Bruteforce</option>
          </select>
          <div class="ms-2 position-relative">
              <i class="bi bi-exclamation-circle-fill popover-dismiss" tabindex="0" data-bs-toggle="popover" data-bs-trigger="focus" data-bs-title="Supported Modes Information" 
              data-bs-content="<ul><li>Dictionary: has a limit of one Node per Job</li><li>Dictionary with Rules: has a limit of one Node per Job
              </li><li>Dictionary with Combinator: has a limit of one Node and two dictionaries per Job</li>
              <li>Bruteforce</li></ul>" 
              data-bs-html="true"></i>
          </div>
        </div>       
      </div>
      <div class="algorithms mx-5">
        <label class="d-flex">Time usage</label>
        <select class="form-select bg-dark text-white form-select-bg-position" aria-label="Default select example" v-model="selectedTime">
          <option value="1h" selected>1 hour</option>
          <option value="12h">12 hours</option>
          <option value="1d">1 day</option>
        </select>
      </div> 
    </div>
    <br>
    <br>
    <div class="d-flex justify-content-center">
      <div class="algorithms mx-5" v-if="selectedMode!='B'">
        <label class="d-flex justify-content-center me-5">Dictionaries</label>
        <div class="form-check-container">
          <div class="form-check">
            <input class="form-check-input" type="checkbox" id="masterCheckbox" v-model="selectAll" @change="toggleAll" :disabled="selectedMode=='C'">
            <label class="form-check-label mx-1" for="masterCheckbox">Select/Deselect All</label>
          </div>
          <div v-for="dictionary in dictionaries" :key="dictionary" class="form-check">
            <input class="form-check-input" type="checkbox" :id="dictionary" :value="dictionary" v-model="selectedDictionary" :disabled="isDictionaryDisabled(dictionary)">
            <label class="form-check-label mx-1" :for="dictionary">
              {{ dictionary }}
            </label>
          </div>
        </div>
      </div>
      <div class="algorithms mx-5">
        <label for="descriptionInput" class="text-white">Job description:</label>
        <input id="descriptionInput" class="form-control bg-dark text-white" type="text" v-model="jobDescription">
      </div>
    </div>
    <br>
    <div class="d-flex justify-content-center" v-if="selectedMode == 'R'">
      <div class="algorithms mx-5">
        <label class="d-flex justify-content-center">Add Rules</label>
        <div class="d-flex justify-content-center">
          <div class="form-check form-check-inline ms-5">
            <input class="form-check-input" type="radio" name="ruleOption" id="ruleOptionFile" @click="setRuleOption('file')" :checked="ruleOption === 'file'">
            <label class="form-check-label" for="ruleOptionFile">Upload a .txt file</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="radio" name="ruleOption" id="ruleOptionCheckboxes" @click="setRuleOption('oneRule')" :checked="ruleOption === 'oneRule'">
            <label class="form-check-label" for="ruleOptionCheckboxes">OneRuleToRuleThemAll</label>
          </div>
        </div>
        <div class="d-flex justify-content-center mt-3" v-if="ruleOption === 'file'">
          <div class="mb-3">
            <label for="ruleFile" class="form-label">Upload your rules .txt file here</label>
            <input class="form-control bg-dark text-white" type="file" id="ruleFile" @change="handleRuleFileChange">
          </div>
        </div>
      </div>
    </div>
    <br>
    <div class="d-flex justify-content-center">
      <div class="algorithms mx-5">
        <br>
        <div class="accordion accordion" style="width: 500px;" id="gpuAccordion">
          <div class="accordion-item" v-for="(node, index) in filteredNodes" :key="node.id">
            <h2 class="accordion-header">
              <button class="accordion-button collapsed bg-dark text-white" @click="handleAccordionClick($event, 'node-' + index)" type="button" data-bs-toggle="collapse" :data-bs-target="'#flush-collapse-' + index" aria-expanded="false" :aria-controls="'flush-collapse-' + index">
                Node: {{ node.uuid }}
              </button>
            </h2>
            <div :id="'flush-collapse-node-' + index" class="accordion-collapse collapse" :aria-labelledby="'flush-heading-node-' + index" data-bs-parent="#gpuAccordion">
              <div class="accordion-body bg-dark text-white">
                <div v-if="node.gpus && node.gpus.length > 0">
                  <div v-for="gpu in node.gpus" :key="gpu.id" class="form-check">
                    <input class="form-check-input" type="checkbox" :id="'gpu-' + gpu.id" :value="gpu.id" v-model="selectedDevices ">
                    <label class="form-check-label" :for="'gpu-' + gpu.id">
                      GPU {{ gpu.name}}
                    </label>
                  </div>
                </div>
               <div v-else>
                  <input type="checkbox" :value="'CPU-' + node.uuid" v-model="selectedDevices">
                  <label>CPU {{node.cpu}}</label>
               </div> 
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="d-flex justify-content-center mt-3">
      <div v-if="acceptedNodes.length == 0">
      <label class="text-white">
        Currently there are no available Nodes.
      </label>  
      </div>
      <div v-else>
      <label class="text-white" v-if="selectedDevices.length > 0">
        Selected Devices: {{ selectedDevices.length }}
      </label>
      <label class="text-white" v-else>
        No Devices Selected.
      </label>
      </div>
    </div>
    <br>
    <div class="d-flex justify-content-center">
      <div class="form-check form-check-inline">
        <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault1" @click="setOption('file')" :checked="radioOption === 'file'"> 
        <label class="form-check-label" for="flexRadioDefault1">Upload a .txt file</label>
      </div>
      <div class="form-check form-check-inline ms-5">
        <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" @click="setOption('text')" :checked="radioOption === 'text'">
        <label class="form-check-label" for="flexRadioDefault2">Add written hashes</label>
      </div>
    </div>
    <br>
    <div class="d-flex justify-content-center" v-if="radioOption === 'file'">
      <div class="mb-3 move-input">
        <label for="formFile" class="form-label">Import your .txt file here</label>
        <input class="form-control bg-dark text-white" type="file" id="formFile" @change="handleFileChange">
      </div>
    </div>
    <div class="d-flex justify-content-center" v-if="radioOption === 'text'">
      <div class="mb-3">
        <label for="exampleFormControlTextarea1" class="form-label">Please write your hashes, one per line</label>
        <textarea class="form-control bg-dark text-white move-textarea" id="exampleFormControlTextarea1" rows="10" v-model="textSent"></textarea>
      </div>
    </div>
    <br>
  </div>
  <br>
  <div class="d-flex justify-content-center">
         <button type="button" class="btn btn-outline-info px-5 mx-2" @click="sendWork">Send Work</button>
  </div>
  <br>
  <br>
</template>

<style>
.form-select-bg-position {
  width: 250px;
}
.form-selectmultiple-bg-position {
  width: 650px;
  height: 150px;
}

.form-check-container {
  display: grid;
  grid-template-columns: 1fr 1fr; 
  gap: 10px; 
}

.form-check {
  display: flex;
  align-items: center;
}
.move-input {
  margin-right: 350px;
  width: 300px;
}
.move-textarea {
  width: 650px;
  height: 200px;
}
.algorithms {
  display: flexbox;
  flex-direction: row;
}
.accordion-button {
  background-color: #343a40;
  color: #ffffff;
  font-size: 18px;
  padding: 15px;
  width: 100%;
  text-align: left;
}
.accordion-body {
  background-color: #343a40;
  color: #ffffff;
  font-size: 16px;
  padding: 15px;
}
.popover-header {
  color: black !important;
}
</style>
