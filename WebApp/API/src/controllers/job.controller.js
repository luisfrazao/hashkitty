import e from "express";
import models from "../models/index.js";
import axios from "axios";
import { Op } from "sequelize";
import dotenv from "dotenv/config.js"; 
import node from "../models/node.model.js";
import {getIo, getUserSocketMap } from "../socket.js"


export const getJobs = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const jobs = await models.job.findAll({
            where: {
                user_id: req.user.id
            },
        });
        res.json(jobs);
    } catch (error) {
        res.json({ error: error });
    }
 };

export const getJobById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "Missing id parameter" });
        }
        const job = await models.job.findByPk(req.params.id);
        if (job) {
            res.json(job);
        } else {
            res.status(404).send("Job not found");
        }
    } catch (error) {
        res.status(500).json({ error: error });
    }
};

export const createJob = async (req, res) => {
    
    if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }

    let middlewareIP;

    try {
        const middleware = await models.middleware.findOne();
        if (middleware) {
            middlewareIP = middleware.IP;
        } else {
            return res.status(500).json({ message: "No Middleware could be found, please add one!" });
        }
    } catch (error) {
        return res.status(500).json({ message: "Not able to create job, try again later" });
    }

    try {
        const job = await models.job.create({
            mode: req.body.mode,
            lists: (req.body.lists ? req.body.lists.join(",") : null),
            status: "Pending",
            rules: (req.body.rules ? req.body.rules.join(",") : null),
            hash_list_id: req.body.hash_list_id,
            user_id: req.user.id,
            runtime: req.body.runtime,
            description: req.body.description
        });

        if (req.body.gpus) {
            const gpus = req.body.gpus;
            await Promise.all(gpus.map(async (gpuId) => {
                if (gpuId.toString().startsWith('CPU-')) {
                    let cpuId = gpuId.toString().replace('CPU-', '');
                    await models.jobCpu.create({
                        job_id: job.id,
                        cpu_id: cpuId
                    });
                } else {
                    await models.jobGpu.create({
                        job_id: job.id,
                        gpu_id: gpuId
                    });
                }
            }));
        }
        const hashList = await models.hashList.findByPk(req.body.hash_list_id);
        const hashListList = hashList.list;
        const hashListAlgorithm = hashList.algorithm;

        try {

            if (req.body.gpus) {
                const uniqueNodes = new Set();
                const nodes = await Promise.all(req.body.gpus.map(async (gpuId) => {
                    if (gpuId.toString().startsWith('CPU-')) {
                        let nodeId = gpuId.toString().replace('CPU-', '');
                        const node = await models.node.findOne({
                            where: {
                                uuid: nodeId
                            }
                        });
                        uniqueNodes.add(node.uuid);
                        return node ? node.uuid : null;
                    } else {
                        const gpu = await models.gpu.findOne({
                            where: {
                                id: gpuId
                            }
                        });
                        uniqueNodes.add(gpu.node_id);
                        return gpu ? gpu.node_id : null;
                    }
                }));
                const Unodes = Array.from(uniqueNodes);
                const gpusByNode = await Promise.all(Unodes.map(async (nodeId) => {
                    const gpus = [];
                    const benchmark = [];
                    for (const gpuId of req.body.gpus) {
                        if (gpuId.toString().startsWith('CPU-')) {
                            let nodeUuid = gpuId.toString().replace('CPU-', '');
                            if (nodeUuid === nodeId) {
                                const node = await models.node.findOne({
                                    where: {
                                        uuid: nodeId
                                    }
                                });
                                if (node) {
                                    gpus.push("1");
                                    switch(hashListAlgorithm){ 
                                        case "MD5":
                                            benchmark.push(node.md5_benchmark);
                                            break;
                                        case "SHA-256":
                                            benchmark.push(node.sha256_benchmark);
                                            break;
                                        case "WPA2":
                                            benchmark.push(node.wifi_benchmark);
                                            break;
                                    }
                                }
                            }
                        } else {
                            const gpu = await models.gpu.findOne({
                                where: {
                                    node_id: nodeId,
                                    id: gpuId
                                }
                            });
                            if (gpu) {
                                gpus.push(gpu.device_id);
                                switch(hashListAlgorithm){ 
                                    case "MD5":
                                        benchmark.push(gpu.md5_benchmark);
                                        break;
                                    case "SHA-256":
                                        benchmark.push(gpu.sha256_benchmark);
                                        break;
                                    case "WPA2":
                                        benchmark.push(gpu.wifi_benchmark);
                                        break;
                                }
                            }
                        }
                    }
                    return {
                        nodeId: nodeId,
                        gpus: gpus,
                        benchmark: benchmark,
                    };
                }));
                
                await axios.post(`http://${middlewareIP}:3080/work`, { 
                    jobId: job.id,
                    jobDescription: job.description,
                    gpusByNode: gpusByNode,
                    hashList: hashListList,
                    hashListAlgorithm: hashListAlgorithm,
                    runtime: job.runtime,
                    mode : job.mode,
                    lists: job.lists,
                    rules: job.rules
                });
            } else {
            await axios.post(`http://${middlewareIP}:3080/work`, { 
                jobId: job.id,
                jobDescription: job.description,
                hashListText: hashListList,
                hashListAlgorithm: hashListAlgorithm,
                runtime: job.runtime,
                mode : job.mode,
                lists: job.lists,
            });
            }
        } catch (error) {
            console.log(error);
            job.update({status: "Failed"});
            return res.status(201).json({job, message: "Job created but failed to send to worker"});
        }
        res.status(201).json(job);
    } catch (error) {
        res.status(500).json({ message: "Not able to create job, try again later" });
    }
};


export const updateJob = async (req, res) => {
    try {
        if (!req.user || !req.middleware) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: "Missing id parameter" });
        }
        const job = await models.job.findByPk(req.params.id);
        if (job) {
            if (!req.middleware) {
                return res.status(403).json({ message: "Unauthorized" });
            }
            if (req.body.status){
                await job.update({
                    status: req.body.status
                });
            }
            
            if (req.body.status == "Running" || req.body.status == "Completed" || req.body.status == "Failed"){
                const gpuIds = await models.jobGpu.findAll({
                    attributes: ['gpu_id'],
                    where: {
                        job_id: job.id
                    }
                });
                
                const cpuIds = await models.jobCpu.findAll({
                    attributes: ['cpu_id'],
                    where: {
                        job_id: job.id
                    }
                });


                const gpuIdsArray = gpuIds.map(gpu => gpu.gpu_id);
                const cpuIdsArray = cpuIds.map(cpu => cpu.cpu_id);

                await models.gpu.update({
                    status: req.body.status === "Running" ? "Working" : "Available"
                }, {
                    where: {
                        id: {
                            [Op.in]: gpuIdsArray
                        }
                    }
                });

                await node.update({
                    cpu_status: req.body.status === "Running" ? "Working" : "Available"
                }, {
                    where: {
                        uuid: {
                            [Op.in]: cpuIdsArray
                        }
                    }
                });
                
                if (req.body.result){
                    
                    if (job.result == "" || job.result == null) {
                        await job.update({
                            result: req.body.result
                        });
                    }else{
                        let receivedResultArray = req.body.result.split(",");
                        let storedResultArray = job.result.split(",");

                        let filteredResultArray = receivedResultArray.filter(receivedResultArray => !storedResultArray.includes(receivedResultArray));

                        if (filteredResultArray.length > 0){
                            let newResult = filteredResultArray.join(",");
                            await job.update({
                                result: job.result +','+ newResult,
                            });
                        }                       
                    }
                    
                       
                    try{
                        const io = getIo()
                        const userSocketMap = getUserSocketMap();
                        const socketId = userSocketMap.get(job.user_id);
                        if (socketId) {
                            io.to(socketId).emit('jobUpdate', { jobId: job.id, totalResult: job.result ,updatedResult: req.body.result, status: req.body.status });
                        }

                        if (req.body.status == "Completed" || req.body.status == "Failed"){
                            
                            const nodes = await node.findAll({
                                where: {
                                    validation: 'Accepted'
                                },
                                attributes: ['uuid', 'cpu', 'ram', 'status', 'middleware_UUID', 'cpu_status'],
                                include: [{
                                    model: models.gpu,
                                    as: 'gpus',
                                    attributes: ['id','device_id', 'vendor', 'name', 'vram', 'status']
                                }]
                            });
                            userSocketMap.forEach((value, key) => {
                                io.to(value).emit('nodeUpdate', nodes);
                            });
                        }
                    }
                    catch (error){
                        console.log(error)
                    }
                }
                if (req.body.status == "Failed"){
                    try{
                        const io = getIo()
                        const userSocketMap = getUserSocketMap();
                        const socketId = userSocketMap.get(job.user_id);
                        if (socketId) {
                            io.to(socketId).emit('jobUpdate', { jobId: job.id, status: req.body.status });
                        }
                    }
                    catch (error){
                        console.log(error)
                    }
                }
            }
            
            res.status(201).send({ message: "Job updated successfully" });
        } else {
            res.status(404).send("Job not found");
        }
    } catch (error) {
        res.status(500).json({ error: "internal server error" });
    }
};

export const deleteJob = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const job = await models.job.findByPk(req.params.id);
        if (job) {
            if (job.user_id !== req.user.id) {
                return res.status(403).json({ message: "Unauthorized" });
            }
            await job.destroy();
            res.json({ message: "Job deleted successfully" });
        } else {
            res.status(404).send("Job not found");
        }
    }
    catch (error) {
        res.status(500).json({ error: "internal server error" });
    }
};

export default {getJobs, getJobById, createJob, updateJob, deleteJob};