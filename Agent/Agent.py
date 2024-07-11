import re
import json
import psutil
import cpuinfo
import subprocess
import asyncio as asy
import websockets as ws
import detect
import os
import copy
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import multiprocessing


def load_config(filename):
    with open(filename, 'r') as f:
        return json.load(f)

def save_config(config, filename):
    with open(filename, 'w') as f:
        json.dump(config, f, indent=4)

def main():
    config = load_config('config.json')
    sysInfo=getSysInfo()
    
    if detect.linux:
        loop = asy.new_event_loop()
        asy.set_event_loop(loop)
        loop.run_until_complete(send_receive_messages(sysInfo, config))
    if detect.windows:
        asy.ProactorEventLoop().run_until_complete(send_receive_messages(sysInfo, config))

async def send_keep_alive(websocket,time=60):
    while True:
        await asy.sleep(time)
        await websocket.send("keep-alive")

async def send_receive_messages(gpu_info, config):
    uri = config["websocket_uri"]
    agent_uuid = config.get("uuid")
    job_tasks = {}  # Dictionary to store running job tasks

    while True:
        try:
            async with ws.connect(uri) as websocket:
                if agent_uuid:
                    await websocket.send(f"hello uuid: {agent_uuid}")
                    await websocket.recv()
                else:
                    await websocket.send("hello")
                    response = await websocket.recv()
                    uuid_match = re.search(r'Hello, Client (\S+)!', response)
                    if uuid_match:
                        agent_uuid = uuid_match.group(1)
                        config["uuid"] = agent_uuid
                        save_config(config, 'config.json')
                        print(f"Received UUID from middleware: {agent_uuid}")

                await websocket.send(gpu_info)

                keep_alive_task = asy.create_task(send_keep_alive(websocket))

                while True:
                    job_request = await websocket.recv()
                    try:
                        job_request_json = json.loads(job_request)
                        print(f"Received job request: {job_request_json}")

                        if job_request_json.get("message") == "stop-job":
                            job_id = job_request_json.get("job_id")
                            if job_id in job_tasks:
                                job_tasks[job_id].cancel()
                                del job_tasks[job_id]
                                print(f"Stopped job: {job_id}")
                            else:
                                print(f"Job {job_id} not found")

                        else:
                            job_task = asy.create_task(hashcat_task(websocket, job_request_json))
                            job_tasks[job_request_json["job_id"]] = job_task
                    except json.JSONDecodeError:
                        print("Received invalid JSON from Middleware")

        except ws.exceptions.ConnectionClosed:
            print("Connection to the server closed")
            await asy.sleep(5)
        except OSError as e:
            print("Could not connect to Middleware: \n", e)
            await asy.sleep(5)
        finally:
            keep_alive_task.cancel()

class MyHandler(FileSystemEventHandler):
    def __init__(self, file_path, websocket, job_id):
        super().__init__()
        self.file_path = os.path.abspath(file_path)
        self.websocket = websocket
        self.job_id = job_id
        self.last_position = 0

    async def send_update(self, new_content):
        processed_content = new_content.replace('\n', ',').rstrip(',')
        message = json.dumps({
            'status': 'Running',
            'result': processed_content,
            'job_id': self.job_id
        })
        await self.websocket.send(f"potfile-update:{message}")
        
async def monitor_file(file_path, websocket, job_id):

    loop = asy.get_running_loop()

    event_handler = MyHandler(file_path, websocket, job_id)
    last_modified = os.path.getmtime(file_path)

    stop_event = asy.Event()

    try:
        while not stop_event.is_set():
            current_modified = os.path.getmtime(file_path)
            if current_modified > last_modified:
                with open(file_path, 'r') as f:
                    f.seek(event_handler.last_position)
                    new_content = f.read()
                    if new_content:
                        asy.run_coroutine_threadsafe(event_handler.send_update(new_content), loop)
                        event_handler.last_position = f.tell()
                last_modified = current_modified
            await asy.sleep(1)
    finally:
        print("Job Done")
        stop_event.set()
   
def hashcatExec(hashs, hashMode, device, runtime, sessionName, attackMode, lists, rules):
    try:
        switch_hash = {
            'MD5': '0',
            'SHA-256': '1400',
            'WPA2': '22000',
        }

        switch_time = {
            '1h': '3600',
            '12h' : '43200',
            '1d' : '86400',
        }

        switch_mode = {
            'D': '0',
            'R': '0',
            'C': '1',
            'B': '3'
        }

        switch_lists = {
            "RockYou": "rockyou.list",
            "ASLM": "ASLM.list",
            "HK": "hk_hlm_founds.list",
            "Hashkiller": "hashkiller_output.list",
            "Crackstation":"crackstation-human-only.list",
            "5M":"5milhoes.list",
            "PTdicio":"dicionariopt.list",
        }

        switch_rules = {
            "OneRuleToRuleThemAll": "OneRuleToRuleThemAll.rule"
        }
        base_path = './lists/' if detect.linux else '../lists/'
        rule_path = './rules/' if detect.linux else '../rules/' 

        hashMode = switch_hash[hashMode]
        runtime = switch_time[runtime]
        attackMode = switch_mode[attackMode]

        if attackMode != '3':
            if ',' in lists:
                lists_paths = [os.path.join(base_path, switch_lists.get(list_item.strip(), list_item.strip())) for list_item in lists.split(',')]
            else:
                lists = switch_lists.get(lists.strip())
                lists_paths = [os.path.join(base_path, lists)]

            if rules != None :
                if rules in switch_rules:
                    if ',' in rules:
                        rules_paths = [os.path.join(rule_path, switch_rules.get(rule_item.strip(), rule_item.strip())) for rule_item in rules.split(',')]
                    else:
                        rules_get = switch_rules.get(rules.strip())
                        rules_paths = [os.path.join(rule_path, rules_get)]
                else:
                    rules_items = rules.split(',')
                    formatted_rules = ' '.join([f"-j '{rule.strip()}'" for rule in rules_items])
                    formatted_rules_list = formatted_rules.split()
                    
                
                
        hash_filename = f'./../pots/{sessionName}/{sessionName}.hashlist' if detect.windows else f'./pots/{sessionName}/{sessionName}.hashlist'
        
        with open(hash_filename, 'w') as hash_file:
            hash_file.write('\n'.join(hashs.split(',')))

        if detect.linux:   
            if attackMode == '3':
                command = ['hashcat', '-m', hashMode, '-a', attackMode, f"./{hash_filename}",'-d', device, 
                        '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'./pots/{sessionName}/{sessionName}.pot']
            elif rules != None:
                if rules in switch_rules :
                    command = ['hashcat', '-m', hashMode, '-a', attackMode, f"./{hash_filename}"] + lists_paths + ["-r"] + rules_paths + ['-d', device, 
                            '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'./pots/{sessionName}/{sessionName}.pot']
                else :
                    command = ['hashcat', '-m', hashMode, '-a', attackMode, f"./{hash_filename}"] + lists_paths + formatted_rules_list + ['-d', device, 
                            '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'./pots/{sessionName}/{sessionName}.pot']
            else:
                command = ['hashcat', '-m', hashMode, '-a', attackMode, f"./{hash_filename}"] + lists_paths + ['-d', device, 
                        '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'./pots/{sessionName}/{sessionName}.pot']  
                     
        if detect.windows:
            if attackMode == '3':
                command = ['hashcat.exe', '-m', hashMode, '-a', attackMode, f"{hash_filename}",'-d', device, 
                        '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'../pots/{sessionName}/{sessionName}.pot']
            elif rules != None:
                if rules in switch_rules :
                    command = ['hashcat.exe', '-m', hashMode, '-a', attackMode, f"./{hash_filename}"] + lists_paths + ["-r"] + rules_paths + ['-d', device, 
                            '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'../pots/{sessionName}/{sessionName}.pot']
                else :
                    command = ['hashcat.exe', '-m', hashMode, '-a', attackMode, f"./{hash_filename}"] + lists_paths + formatted_rules_list + ['-d', device, 
                            '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'../pots/{sessionName}/{sessionName}.pot']
            else:
                command = ['hashcat.exe', '-m', hashMode, '-a', attackMode, f"{hash_filename}"] + lists_paths + ['-d', device, 
                        '--session', sessionName, f'--runtime={runtime}', '--potfile-path', f'../pots/{sessionName}/{sessionName}.pot']
        
        run = subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if detect.windows:
            os.chdir('..')

        error_messages = {
            -11: 'self-test failed',
            -10: 'autotune failure',
            -9: 'mixed backend errors (combo of -3, -4, -5, -6, -7 errors type)',
            -8: 'backend error: Invalid module_extra_buffer_size',
            -7: 'backend error: Too many compute units to keep minimum kernel accel limit',
            -6: 'backend error: kernel create error',
            -5: 'backend error: main kernel build error',
            -4: 'backend error: memory hit',
            -3: 'backend error: skipping hash-type due to module_unstable_warning settings',
            -2: 'gpu-watchdog alarm',
            -1: 'error',
            0: 'OK/cracked',
            1: 'exhausted',
            2: 'aborted',
            3: 'aborted by checkpoint',
            4: 'aborted by runtime',
            5: 'aborted by finish',
        }
        error_message = error_messages.get(run.returncode, f'Unknown error code: {run.returncode}')
        if run.returncode == 0:
            print("Hashcat executed successfully.") 
            results = {
                'status': 'Completed',
                'result': extract_password(sessionName),
                'job_id': sessionName
            }
        elif  error_message == "exhausted" or error_message == "aborted by runtime" or error_message == "aborted by finish" or error_message == "aborted by checkpoint":
           return {
                'status': 'Completed',
                'result': extract_password(sessionName),
                'job_id': sessionName
           }
        else:
            results = {
                'status': 'Failed',
                'message': error_message,
                'job_id': sessionName,
                'error_message': run.stderr.strip() if run.stderr else None
            }

    except Exception as e:
       return  {
            'status': 'Failed',
            'job_id': sessionName,
            'message': str(e)
       }

    print(results)
    return results

def extract_password(sessionName):
    with open(f'./pots/{sessionName}/{sessionName}.pot', 'r') as pot_file:
        pot_lines = pot_file.readlines()
        cracked_passwords = ','.join([line.replace('\n', '').strip() for line in pot_lines if ":" in line])
        return cracked_passwords

async def hashcat_task(websocket, job_request_json):
    keepAlive_task = asy.create_task(send_keep_alive(websocket,5))

    pot_file_path = f"./pots/{str(job_request_json['job_id'])}/{str(job_request_json['job_id'])}.pot" if detect.linux else f"./../pots/{str(job_request_json['job_id'])}/{str(job_request_json['job_id'])}.pot"
    if detect.windows:
        os.chdir('hashcat-6.2.6')
        os.makedirs(f"./../pots/{str(job_request_json['job_id'])}", exist_ok=True)
        open(f"./../pots/{str(job_request_json['job_id'])}/{str(job_request_json['job_id'])}.pot", 'w').close()
    if detect.linux:
        os.makedirs(f"./pots/{str(job_request_json['job_id'])}", exist_ok=True)
        open(f"./pots/{str(job_request_json['job_id'])}/{str(job_request_json['job_id'])}.pot", 'w').close()

    monitor_task = asy.create_task(monitor_file(pot_file_path, websocket,str(job_request_json['job_id'])))

    results = await asy.to_thread(hashcatExec, hashs=job_request_json['hashlist'], hashMode=job_request_json['algorithm'], 
                                  device=job_request_json['devices'], runtime=job_request_json['runtime'], 
                                  sessionName=str(job_request_json['job_id']), attackMode=job_request_json['mode'], 
                                  lists=job_request_json['lists'], rules=job_request_json['rules'])
    

    keepAlive_task.cancel()
    await websocket.send(f"work-done:{json.dumps(results)}")
    monitor_task.cancel()

def getSysInfo():

    multiprocessing.freeze_support()
    sysInfo={
        "CPU":cpuinfo.get_cpu_info()['brand_raw'],
        "RAM":str(round(psutil.virtual_memory().total / (1024 ** 3),2)) + " GB"
    }
    
    if detect.linux:
        gpuInfo = getGPUsLinux()
    elif detect.windows:
        gpuInfo= getGPUsWindows()

    sysInfo['gpuInfo']=gpuInfo
    
    if os.path.exists('sysInfo.json'):
        with open('sysInfo.json', 'r') as json_file:
            stored_sysInfo = json.load(json_file)
    else:
        stored_sysInfo = None

    copy_stored_sysInfo = copy.deepcopy(stored_sysInfo) if stored_sysInfo else None
    if copy_stored_sysInfo:
        if copy_stored_sysInfo['gpuInfo']:
            for gpu in copy_stored_sysInfo['gpuInfo']:
                if 'benchmark' in gpu:
                    del gpu['benchmark']
        elif 'cpuBenchmark' in copy_stored_sysInfo:
            del copy_stored_sysInfo['cpuBenchmark']

    if copy_stored_sysInfo != sysInfo:
        if gpuInfo:
            for gpu in gpuInfo:
                gpu['benchmark'] = benchmark([gpu['Device']])
            sysInfo['gpuInfo'] = gpuInfo
        else:
            sysInfo['cpuBenchmark'] = benchmark(["1"])
            
        with open('sysInfo.json', 'w') as json_file:
            json.dump(sysInfo, json_file, indent=4)
        sysInfo = json.dumps(sysInfo, indent=4)
        return sysInfo
    
    stored_sysInfo = json.dumps(stored_sysInfo, indent=4)
    return stored_sysInfo

def getGPUsLinux():
    processed_devices = set()
    gpu_info = None
    run = subprocess.run(['hashcat', '-I'], capture_output=True, text=True)
    all_devices = re.findall(r'Backend Device ID #(\d+).*?(?=Backend Device ID|\Z)', run.stdout, re.DOTALL)
    i = 0
    for device_id in all_devices:

        device_dict = {}
        device_info = re.search(fr'Backend Device ID #{device_id}(.*?)(?=Backend Device ID|\Z)', run.stdout, re.DOTALL)
        if device_info:
            lines = device_info.group(1).strip().split("\n")[:9]
            for line in lines:
                if ":" in line:
                    key, value = line.split(":", 1)
                    device_dict[key.strip().replace(".", "")] = value.strip()
            if device_dict.get("Type") == "GPU" :
                alias_match = re.search(r' \(Alias: #(\d+)\)', device_info.group(1))
                primary_device_id = alias_match.group(1) if alias_match else device_id
                
                unique_device_key = (primary_device_id, device_dict.get("Name"))

                if unique_device_key not in processed_devices:
                    processed_devices.add(unique_device_key)
                    gpu_data = {
                        "Device": primary_device_id,
                        "Vendor": device_dict.get("Vendor"),
                        "Name": device_dict.get("Name"),
                        "MemoryTotal": re.search(r"(\d+ MB)", device_dict.get("MemoryTotal")).group(1)
                    }

                    if i > 0:
                        gpu_info_add = gpu_data
                        if isinstance(gpu_info, list):
                            gpu_info.append(gpu_info_add)
                        else:
                            gpu_info = [gpu_info, gpu_info_add]
                    else:
                        i += 1
                        gpu_info = [gpu_data]

    return gpu_info

def getGPUsWindows():
    os.chdir('hashcat-6.2.6')
    run = subprocess.run(['hashcat.exe','-I'], capture_output=True, text=True)
    all_devices = re.findall(r'Backend Device ID #(\d+).*?(?=Backend Device ID|\Z)', run.stdout, re.DOTALL)
    os.chdir('..')

    processed_devices = set()
    gpu_info = None
    i = 0
    for device_id in all_devices:

        device_dict = {}
        device_info = re.search(fr'Backend Device ID #{device_id}(.*?)(?=Backend Device ID|\Z)', run.stdout, re.DOTALL)
        if device_info:
            lines = device_info.group(1).strip().split("\n")[:9]
            for line in lines:
                if ":" in line:
                    key, value = line.split(":", 1)
                    device_dict[key.strip().replace(".", "")] = value.strip()
            if device_dict.get("Type") == "GPU" :
                alias_match = re.search(r' \(Alias: #(\d+)\)', device_info.group(1))
                primary_device_id = alias_match.group(1) if alias_match else device_id
                
                unique_device_key = (primary_device_id, device_dict.get("Name"))

                if unique_device_key not in processed_devices:
                    processed_devices.add(unique_device_key)
                    gpu_data = {
                        "Device": primary_device_id,
                        "Vendor": device_dict.get("Vendor"),
                        "Name": device_dict.get("Name"),
                        "MemoryTotal": re.search(r"(\d+ MB)", device_dict.get("MemoryTotal")).group(1)
                    }

                    if i > 0:
                        gpu_info_add = gpu_data
                        if isinstance(gpu_info, list):
                            gpu_info.append(gpu_info_add)
                        else:
                            gpu_info = [gpu_info, gpu_info_add]
                    else:
                        i += 1
                        gpu_info = [gpu_data]

    return gpu_info

def benchmark(devices):
    speed_regex = r"Speed\.#(\d+).*:\s+([\d\.]+ (H/s|kH/s|MH/s|GH/s|TH/s|PH/s|EH/s|ZH/s|YH/s))"
    benchmarks = {}
    final_benchmarks = {}
    if detect.linux:
        for device in devices:
            print(f"Running benchmarks for device {device}")
            md5_bench = subprocess.run(['hashcat', '-b', '-m', '0', '-d' ,device], capture_output=True, text=True)
            sha256_bench = subprocess.run(['hashcat', '-b', '-m', '1400', '-d' ,device], capture_output=True, text=True)
            wifi_bench = subprocess.run(['hashcat', '-b', '-m', '22000', '-d' ,device], capture_output=True, text=True)
            benchmarks[device] = {'MD5': md5_bench.stdout, 'SHA-256': sha256_bench.stdout, 'WiFi': wifi_bench.stdout}
            
    elif detect.windows:
        os.chdir('hashcat-6.2.6')
        for device in devices:
            md5_bench = subprocess.run(['hashcat.exe', '-b', '-m', '0', '-d' ,device], capture_output=True, text=True)
            sha256_bench = subprocess.run(['hashcat.exe', '-b', '-m', '1400', '-d' ,device], capture_output=True, text=True)
            wifi_bench = subprocess.run(['hashcat.exe', '-b', '-m', '22000', '-d' ,device], capture_output=True, text=True)
            benchmarks[device] = {'MD5': md5_bench.stdout, 'SHA-256': sha256_bench.stdout, 'WiFi': wifi_bench.stdout}
        os.chdir('..')

    for device in benchmarks:
        for key, value in benchmarks[device].items():
            match = re.search(speed_regex, value)
            final_benchmarks[key] = match.group(2) if match else None

    return final_benchmarks

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\nExiting program")