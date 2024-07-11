import models from "../models/index.js";
import middleware from "../models/middleware.model.js";
import { Op } from "sequelize";
const {node, gpu, user} = models;
import {getIo, getAdminSocketMap, getUserSocketMap} from "../socket.js"

export const getNodes = async (req, res) => {
  try {
    const nodes = await node.findAll({
      where: {
        validation: 'Accepted'
      },
      attributes: ['uuid', 'cpu', 'ram', 'status', 'middleware_UUID', 'cpu_status'],
      include: [{
        model: gpu,
        as: 'gpus',
        attributes: ['id','device_id', 'vendor', 'name', 'vram', 'status']
      }]
    });
    res.json(nodes);
  } catch (error) {
    res.json({ error: error });
  }
};

export const getPendingNodes = async (req, res, next) => {
  try {
    const { username } = req.user;
    const userRecord = await user.findOne({ where: { username } });
    if (!userRecord) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (userRecord.user_type !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    const nodes = await node.findAll({
      where: {
        validation: 'Pending'
      }
    });
    console.log(nodes);
    res.json(nodes);
  } catch (error) {
    res.json({ error: error });
  }
};

export const getNodeByUuid = async (req, res) => {
  try {
    const nodeInfo = await node.findByPk(req.params.uuid);
    if (nodeInfo) {
      res.json(nodeInfo);
    } else {
      res.status(404).send("Node not found");
    }
  } catch (error) {
    res.json({ error: error });
  }
};

export const createNode = async (req, res) => {
  try {
    const uuid = Object.keys(req.body)[0];
    const { CPU, RAM, middleware_uuid, gpuInfo, cpuBenchmark } = req.body[uuid];

    
    const existingNode = await node.findOne({ where: { uuid, deletedAt: { [Op.ne]: null } } });
    if (existingNode && gpuInfo) {
      await existingNode.update({ cpu: CPU, ram: RAM, status: 'U', middleware_UUID: middleware_uuid });
      await gpu.destroy({ where: { node_id: existingNode.uuid } });

      const gpuArray = Array.isArray(gpuInfo) ? gpuInfo : [gpuInfo];
      const newGpus = await Promise.all(gpuArray.map(async (info) => {
        return await gpu.create({
          device_id: info.Device,
          vendor: info.Vendor,
          name: info.Name,
          vram: info.MemoryTotal,
          node_id: existingNode.uuid,
          md5_benchmark: info.benchmark.MD5,
          sha256_benchmark: info.benchmark['SHA-256'],
          wifi_benchmark: info.benchmark.WiFi,
          status: 'Available',
        });
      }));

      return res.status(201).json({ restoredNode: existingNode, newGpus });
    }

    const newNode = await node.create({ 
      uuid, 
      cpu: CPU,
      ram: RAM,
      status: 'Up',
      middleware_UUID: middleware_uuid,
      md5_benchmark: cpuBenchmark && cpuBenchmark.MD5 ? cpuBenchmark.MD5 : null,
      sha256_benchmark: cpuBenchmark && cpuBenchmark['SHA-256'] ? cpuBenchmark['SHA-256'] : null,
      wifi_benchmark: cpuBenchmark && cpuBenchmark.WiFi ? cpuBenchmark.WiFi : null,
    });

    const newGpus = null;
    
    if (gpuInfo){
      const gpuArray = Array.isArray(gpuInfo) ? gpuInfo : [gpuInfo];
      const newGpus = await Promise.all(gpuArray.map(async (info) => {
      return await gpu.create({
        device_id: info.Device,
        vendor: info.Vendor,
        name: info.Name,
        vram: info.MemoryTotal,
        node_id: newNode.uuid,
        md5_benchmark: info.benchmark.MD5,
        sha256_benchmark: info.benchmark['SHA-256'],
        wifi_benchmark: info.benchmark.WiFi,
        status: 'Available',
      });
    }));
    }
    
    try{
      const io = getIo()
      const adminSocketMap = getAdminSocketMap();
      adminSocketMap.forEach((value, key) => {
          io.to(value).emit('newNode', newNode);
      });
    }
    catch (error){
        console.log(error)
    }
    if (newGpus){
      res.status(201).json({newNode, newGpus});
    }else{
      res.status(201).json({newNode});
    }
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateNode = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { status } = req.body;
    const updated = await node.update({ status }, {
      where: {
        uuid,
      },
    });
    if (updated) {
      const updatedNode = await node.findByPk(uuid);
      if (status == 'Down'|| status == 'Up') {
        await gpu.update({ status: 'Available' }, {
          where: {
            node_id: uuid,
          },
        });
      const nodes = await node.findAll({
        where: {
          validation: 'Accepted'
        },
        attributes: ['uuid', 'cpu', 'ram', 'status', 'middleware_UUID', 'cpu_status'],
        include: [{
          model: gpu,
          as: 'gpus',
          attributes: ['id','device_id', 'vendor', 'name', 'vram', 'status']
        }]
      });
      const io = getIo()
      const adminSocketMap = getAdminSocketMap();
      const userSocketMap = getUserSocketMap();
      adminSocketMap.forEach((value, key) => {
          io.to(value).emit('nodeUpdate', nodes);
      });
      userSocketMap.forEach((value, key) => {
          io.to(value).emit('nodeUpdate', nodes);
      });
      }
      res.json(updatedNode);
    } else {
      res.status(404).send("Node not found");
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateNodeValidation = async (req, res) => {
  try {
    const { username } = req.user;
    const { validation } = req.body;
    const { uuid } = req.params;
    const userRecord = await user.findOne({ where: { username } });
    if (!userRecord) {
        return res.status(404).json({ message: 'User not found' });
    }
    if (userRecord.user_type !== 'admin') {
        return res.status(403).json({ message: 'Unauthorized' });
    }
    if (validation !== 'Accepted' && validation !== 'Rejected') {
        return res.status(400).json({ message: 'Invalid validation status' });
    }
    const updated = await node.update({ validation }, {
      where: {
        uuid,
      },
    });

    if (updated) {
      const updatedNode = await node.findByPk(uuid);
      res.json(updatedNode);
      if (validation === 'Accepted') {
        const io = getIo()
        const adminSocketMap = getAdminSocketMap();
        const userSocketMap = getUserSocketMap();
        adminSocketMap.forEach((value, key) => {
            io.to(value).emit('nodeUpdate', {updatedNode});
        });
        const nodes = await node.findAll({
          where: {
            validation: 'Accepted'
          },
          attributes: ['uuid', 'cpu', 'ram', 'status', 'middleware_UUID'],
          include: [{
            model: gpu,
            as: 'gpus',
            attributes: ['id','device_id', 'vendor', 'name', 'vram', 'status']
          }]
        });
        userSocketMap.forEach((value, key) => {
            io.to(value).emit('nodeUpdate', nodes);
        });
      }
    } else {
      res.status(404).send("Node not found");
    }
  } catch (error) {
    res.json({ error: error });
  }
};

export const deleteNode = async (req, res) => {
  try {
    const deleted = await node.destroy({
      where: {
        uuid: req.params.uuid,
      },
    });

    if (deleted) {
      res.status(204).send("Node deleted");
    } else {
      res.status(404).send("Node not found");
    }
  } catch (error) {
    res.json({ error: error });
  }
};

export default { getNodes, getPendingNodes, getNodeByUuid, createNode, updateNode, updateNodeValidation, deleteNode };