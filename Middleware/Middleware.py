import asyncio as asy
import json
from jsonschema import validate, ValidationError
import websockets as ws
import uuid
import requests
import re
from flask import Flask, jsonify, request
from hypercorn.asyncio import serve
from hypercorn.config import Config

app = Flask(__name__)
connected_clients = {}
down_clients = {}
Bearer = ""
jobs_running = {}
api_url = ""

# JSON Schema
json_schema = {
    "$schema": "http://json-schema.org/draft-07/schema#",
    "type": "object",
    "patternProperties": {
        "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$": {
            "type": "object",
            "properties": {
                "CPU": {"type": "string"},
                "RAM": {"type": "string"},
                "gpuInfo": {
                    "type": "object",
                    "properties": {
                        "Device": {"type": "string"},
                        "Vendor": {"type": "string"},
                        "Name": {"type": "string"},
                        "MemoryTotal": {"type": "string"}
                    },
                    "required": ["Device", "Vendor", "Name", "MemoryTotal"]
                }
            },
            "required": ["CPU", "RAM", "gpuInfo"]
        }
    }
}

def load_config(filename):
    with open(filename, 'r') as f:
        return json.load(f)

# Load config from file
with open('config.json', 'r') as f:
    config = json.load(f)

# WebSocket client handler
async def handle_client(websocket, path):
    try:
        hello_message = await websocket.recv()

        if hello_message.startswith("hello"):
            client_id = get_client_id(hello_message)
            connected_clients[client_id] = websocket

            response = f"Hello, Client {client_id}! Connection established."
            await websocket.send(response)
            print(f"Sent response to client: {response}")

            sys_info_list = await receive_system_info(websocket)
            sys_info_db = validate_system_info(sys_info_list, client_id)

            while True:
                message = await websocket.recv()
                print(message)
                if message == "keep-alive":
                    print(f"Received keep-alive message from client {client_id}")
                elif message.startswith("work-done:"):
                    await handle_work_done_message(message, client_id)
                elif message.startswith("potfile-update:"):
                    await handle_potfile_update(message, client_id)
                else:
                    print(f"Received other message from client {client_id}: {message}")

        else:
            print(f"Invalid hello message: {hello_message}")

    except ws.exceptions.ConnectionClosed:
        await handle_client_disconnected(client_id)

def get_client_id(hello_message):
    uuid_match = re.search(r'uuid: (\S+)', hello_message)
    if uuid_match:
        client_id = uuid_match.group(1)
        print(f"Received hello message from client {client_id}")
    else:
        client_id = str(uuid.uuid4())
        print(f"Client doesn't have UUID, generating new UUID: {client_id}")
    return client_id

async def receive_system_info(websocket):
    sys_info_str = await websocket.recv()
    sys_info_list = json.loads(sys_info_str)
    return sys_info_list

def validate_system_info(sys_info_list, client_id):
    sys_info_db = {}
    try:
        validate(instance=sys_info_list, schema=json_schema)
        sys_info_db = {client_id: sys_info_list}
        sys_info_list['middleware_uuid'] = config['uuid']
        print(json.dumps(sys_info_list, indent=4))

        check_uuid_exists = requests.get(f'{api_url}:3000/api/node/{client_id}', headers={'Authorization': Bearer}, verify=False)
        if check_uuid_exists.status_code == 404:
            post = requests.post(f'{api_url}:3000/api/node', json=sys_info_db,
                                 headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
            print(post.status_code, post.text)
        else:
            up = {'status': 'Up'}
            request = requests.put(f'{api_url}:3000/api/node/{client_id}', json=up,
                                   headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
            if request.status_code == 200:
                print("Update Status")
            else:
                print(f"Could not update node {client_id} status: {request.text}")

        print("Validation successful.")
    except ValidationError as e:
        print(f"Validation failed: {e}")

    print("\n", sys_info_db)
    return sys_info_db

async def handle_work_done_message(message, client_id):
    print(f"Received work done message from client {client_id}: {message}")
    extract_data = message.split("work-done:", 1)[1].strip()
    json_results = json.loads(extract_data)
    if json_results.get('status') == 'Completed':
        job_id = int(json_results.get('job_id'))
        jobs_running[job_id][client_id] = 'Completed'
        all_completed = all(status == 'Completed' for status in jobs_running[job_id].values())
        if all_completed:
            await update_completed_job_results(json_results, client_id)
        else:
            json_results['status'] = 'Running'
            await update_completed_job_results(json_results, client_id)
    elif json_results.get('status') == 'Failed':
        await update_failed_job_results(json_results, client_id)

async def handle_potfile_update(message,client_id):
    print(f"Receive potfile update {message}")
    extract_data = message.split("potfile-update:", 1)[1].strip()
    json_results = json.loads(extract_data)
    
    await update_completed_job_results(json_results, client_id)

async def update_completed_job_results(json_results, client_id):
    job_id = json_results.get('job_id')
    put = requests.put(f'{api_url}:3000/api/job/{job_id}', json=json_results,
                       headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
    if put.status_code == 201:
        print(f"Job {client_id} results updated successfully")
    else:
        print(f"Could not update job {client_id} results: {put.text}")

async def update_failed_job_results(json_results, client_id):
    job_id = json_results.get('job_id')
    data = {'message': 'stop-job', 'job_id': job_id}
    for agent_id, agent_ws in connected_clients.items():
        if agent_id != client_id:
            stop_message = json.dumps(data)
            await agent_ws.send(stop_message)

    put = requests.put(f'{api_url}:3000/api/job/{job_id}', json=json_results,
                       headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
    if put.status_code == 201:
        print(f"Node {client_id} results updated successfully")
    else:
        print(f"Could not update job {client_id} results: {put.text}")

async def handle_client_disconnected(client_id):
    print(f"Client {client_id} disconnected")
    sys_info_db = {'status': 'Down'}
    request = requests.put(f'{api_url}:3000/api/node/{client_id}', json=sys_info_db,
                           headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
    if request.status_code == 200:
        print(f"Node {client_id} status updated successfully")
        down_clients[client_id] = connected_clients[client_id]
        del connected_clients[client_id]
        
        for job_id, clients in jobs_running.items():
            if client_id in clients:
                if clients[client_id] == 'Running':
                    clients[client_id] = 'Disconnected'
                all_disconnected = all(status == 'Disconnected' for status in clients.values())
                if all_disconnected:
                    await update_job_status_failed(job_id)

async def update_job_status_failed(job_id):
    json_results = {'job_id': job_id, 'status': 'Failed'}
    put = requests.put(f'{api_url}:3000/api/job/{job_id}', json=json_results,
                       headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
    if put.status_code == 201:
        print(f"Job {job_id} marked as failed")
    else:
        print(f"Could not mark job {job_id} as failed: {put.text}")

# Handle work data
async def handle_work_data(work_data):
    job_id = work_data['jobId']
    algorithm = work_data['hashListAlgorithm']
    hashlist = work_data['hashList']
    gpusByNode = work_data['gpusByNode']
    mode = work_data['mode']
    lists = work_data['lists']
    rules = work_data['rules']
    hashlist_length = len(hashlist)
    print(f"Received work for job {job_id} with {hashlist_length} hashes ({algorithm}) to crack on.")

    
    if mode == "B":
        chunks = divide_hashlist(hashlist, gpusByNode, algorithm)
    elif mode == "D" or mode == "R":
        nodes = parse_nodes(gpusByNode, algorithm) 
        total_powers = calculate_total_power(nodes)
        node_dicts = distribute_dicts(lists, total_powers)
        chunks = {node_id: [hashlist] for node_id in total_powers}
    else:
        chunks = {node_id: hashlist for node_id in [node['nodeId'] for node in gpusByNode]}
    
    jobs_running[job_id] = {}
    for client_id, websocket in connected_clients.items():
        client_found = False
        for gpus_data in gpusByNode:
            if gpus_data.get('nodeId') == client_id:
                devices = gpus_data['gpus']
                client_found = True

        if not client_found:
            continue
        
        if mode == "D" or mode == "R":
            dicts_for_node = node_dicts.get(client_id, [])
            chunk = chunks.get(client_id, [""])
            chunk_data = {
                'job_id': job_id,
                'algorithm': algorithm,
                'runtime': work_data['runtime'],
                'devices': ",".join(devices),
                'hashlist': chunk[0],
                'mode': mode,
                'lists': ",".join(dicts_for_node),
                'rules': rules
            }
        elif mode == "C":
            chunk = chunks.get(client_id, "")
            chunk_data = {
                'job_id': job_id,
                'algorithm': algorithm,
                'runtime': work_data['runtime'],
                'devices': ",".join(devices),
                'hashlist': chunk,
                'mode': mode,
                'lists': lists,
                'rules': rules
            }
        else:
            chunk = chunks.get(client_id,  [""])
            if not chunk:
                print(f"No more chunks available for client {client_id}")
                continue
            
            chunk_data = {
                'job_id': job_id,
                'algorithm': algorithm,
                'runtime': work_data['runtime'],
                'devices': ",".join(devices),
                'hashlist': chunk[0],
                'mode': mode,
                'lists': lists,
                'rules': rules
            }

        if chunk_data['lists'] != "" or mode == "C":  
            await websocket.send(json.dumps(chunk_data))
            print(f"Sent chunk to client {client_id}")

            jobs_running[job_id][client_id] = 'Running'
        else:
            print(f"Client {client_id} has no work to do, skipping")

    requests.put(f'{api_url}:3000/api/job/{job_id}', json={'status': 'Running'}, headers={'Content-Type': 'application/json', 'Authorization': Bearer}, verify=False)
    return jsonify({"message": "Work received successfully!"})


# Divide hashlist in chunks
def divide_hashlist(hashlist, gpusByNode, algorithm):

    if ',' not in hashlist:
        return {node['nodeId']: [hashlist] for node in gpusByNode}

    hashes = hashlist.split(',')
    nodes = parse_nodes(gpusByNode, algorithm)
    total_powers = calculate_total_power(nodes)
    distribution = distribute_hashes(hashes, total_powers)

    hash_chunks = {}
    for node_id in distribution:
        if distribution[node_id]:
            hash_chunks[node_id] = [','.join(distribution[node_id])]
    
    return hash_chunks

# Function to parse nodes and their GPU benchmarks based on the algorithm
def parse_nodes(gpusByNode, algorithm):
    nodes = []
    print("*********************\n\n\n",gpusByNode,"\n\n\n*********************")
    for node_info in gpusByNode:
        node_id = node_info['nodeId']
        if algorithm == "MD5":
            gpu_benchmarks = node_info['benchmark']
        elif algorithm == "SHA-256":
            gpu_benchmarks = node_info['benchmark']
        elif algorithm == "WPA2":
            gpu_benchmarks = node_info['benchmark']
        else:
            raise ValueError("Unsupported algorithm")
        
        nodes.append((node_id, gpu_benchmarks))
    return nodes

# Function to calculate total power for each node
def calculate_total_power(nodes):
    total_powers = {}
    unit_factors = {
        'H/s': 1,
        'kH/s': 1e3,
        'MH/s': 1e6,
        'GH/s': 1e9,
        'TH/s': 1e12,
        'PH/s': 1e15,
        'EH/s': 1e18,
        'ZH/s': 1e21,
        'YH/s': 1e24,
    }
    print(nodes)
    for node_id, gpu_benchmarks in nodes:
        total_power = 0
        for benchmark in gpu_benchmarks:
            match = re.match(r"(\d+(\.\d+)?)\s*([a-zA-Z/]+)", benchmark)
            if match:
                number, _, unit = match.groups()
                number = float(number)
                if unit in unit_factors:
                    total_power += number * unit_factors[unit]
        total_powers[node_id] = total_power

    return total_powers

# Function to distribute hashes based on total power of nodes
def distribute_hashes(hashes, total_powers):
    print("************************************\n\n\n Distributing hashes \n\n\n************************************")
    total_power = sum(total_powers.values())
    distribution = {node_id: [] for node_id in total_powers}

    print(total_powers)
    
    target_counts = {node_id: max(1, int(total_powers[node_id] / total_power * len(hashes))) for node_id in total_powers}

    allocated_hashes = sum(target_counts.values())
    remaining_hashes = len(hashes) - allocated_hashes

    # Distribute any remaining hashes due to rounding
    sorted_nodes = sorted(total_powers, key=total_powers.get, reverse=True)
    for i in range(remaining_hashes):
        target_counts[sorted_nodes[i % len(sorted_nodes)]] += 1
    
    # Distribute the hashes based on the target counts
    current_index = 0
    for node_id in sorted(target_counts, key=total_powers.get, reverse=True):
        count = target_counts[node_id]
        distribution[node_id] = hashes[current_index:current_index + count]
        current_index += count
    
    return distribution

# Function to distribute dictionaries based on total power of nodes
def distribute_dicts(dicts, total_powers):
    list_sizes = {
        "RockYou": 133,
        "ASLM": 479,
        "HK": 389,
        "Hashkiller": 857,
        "Crackstation": 683,
        "5M": 46,
        "PTdicio": 13,
    }
    dicts = dicts.split(',')
    total_size = sum(list_sizes[dict_name] for dict_name in dicts)

    if len(dicts) < len(total_powers):
        sorted_nodes = sorted(total_powers, key=total_powers.get)
        nodes_to_remove = len(total_powers) - len(dicts)
        for _ in range(nodes_to_remove):
            del total_powers[sorted_nodes.pop(0)]

    total_power = sum(total_powers.values())
    distribution = {node_id: [] for node_id in total_powers}
    
    target_sizes = {node_id: int(total_powers[node_id] / total_power * total_size) for node_id in total_powers}

    sorted_dicts = sorted(dicts, key=lambda x: list_sizes[x])
    
    # Assign the lightest dictionary to the weakest node
    weakest_node = min(total_powers, key=total_powers.get)
    lightest_dict = sorted_dicts.pop(0)
    distribution[weakest_node].append(lightest_dict)
    target_sizes[weakest_node] -= list_sizes[lightest_dict]

    # Distribute remaining dictionaries based on target sizes
    for dict_name in sorted_dicts:
        min_node = min((node_id for node_id in distribution if target_sizes[node_id] >= list_sizes[dict_name]),
                       key=lambda x: sum(list_sizes[d] for d in distribution[x]), default=None)
        if min_node is not None:
            distribution[min_node].append(dict_name)
            target_sizes[min_node] -= list_sizes[dict_name]

    # Distribute any unassigned dictionaries
    for dict_name in dicts:
        if not any(dict_name in distribution[node_id] for node_id in distribution):
            max_node = max(target_sizes, key=target_sizes.get)
            distribution[max_node].append(dict_name)
            target_sizes[max_node] -= list_sizes[dict_name]

    return distribution

# Start WebSocket server
async def start_ws_server():
    server_host = '0.0.0.0'
    server_port = '8484'
    start_server = ws.serve(handle_client, server_host, server_port)
    print(f"Websocket server listening on ws://{server_host}:{server_port}")
    await start_server

# Start API server
async def start_api_server():
    api_port = 3080
    config = Config()
    config.bind = [f"0.0.0.0:{api_port}"]
    await serve(app, config)
    print(f"API server listening on http://0.0.0.0:{api_port}")

# Flask route for receiving work
@app.route('/work', methods=['POST'])
async def work():
    work_data = request.get_json()
    print(f"Received work data: {work_data}")
    await handle_work_data(work_data)
    return jsonify({"message": "Work received successfully!"})

# Renew JWT token, not yet implemented
async def renew_token():
    global jwt_token
    await asy.sleep(3600*48)
    jwt_token = requests.post(f'{api_url}:3000/api/middleware/login', json={"uuid": config['uuid'], "password": config['password']}, headers={'Content-Type': 'application/json'}, verify=False)

# Main coroutine
async def main():
    await asy.gather(start_ws_server(), start_api_server())

# Main block
if __name__ == "__main__":
    try:
        config = load_config('config.json')
        api_url = config['api_url']
        jwt_token = requests.post(f'{api_url}:3000/api/middleware/login', json={"uuid": config['uuid'], "password": config['password']}, headers={'Content-Type': 'application/json'}, verify=False)
        Bearer = "Bearer " + jwt_token.text.replace('"', '')
        if jwt_token.status_code != 201:
            print("Could not authenticate with API, your Middleware might not be registered. Exiting.")
            exit(1)
        asy.run(main())
    except KeyboardInterrupt:
        print("\nExiting program")
    except Exception as e:
        print(f"An error occurred: {e}")
        raise e
