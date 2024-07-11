import models from "../models/index.js";

export const getHashLists = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const hashLists = await models.hashList.findAll({where: {user_id: req.user.id}});
        res.json(hashLists);
    } catch (error) {
        res.json({ error: error });
    }
 }

 export const getHashListById = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (!req.params.id) {
            return res.status(400).json({ message: 'Missing id parameter' });
        }
        const hashList = await models.hashList.findByPk(req.params.id);
        if (hashList) {
            res.json(hashList);
        } else {
            res.status(404).send("Hash list not found");
        }
    } catch (error) {
        res.json({ error: error });
    }
 }

 export const createHashList = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const hashList = await models.hashList.create({
            list: req.body.hashlist,
            algorithm: req.body.algorithm,
            user_id: req.user.id
        });
        res.status(201).json(hashList);
    } catch (error) {
        res.status(500).json({ error: error });
    }
 }

 export const deleteHashList = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const hashList = await models.hashList.findByPk(req.params.id);
        if (hashList) {
            if (hashList.user_id !== req.user.id) {
                return res.status(403).json({ message: 'Unauthorized' });
            }
            await hashList.destroy();
            res.json({ message: "Hash list deleted successfully" });
        } else {
            res.status(404).send("Hash list not found");
        }
    }
    catch (error) {
        res.status(500).json({ error: error });
    }
 }

 export default { getHashLists, getHashListById, createHashList, deleteHashList };