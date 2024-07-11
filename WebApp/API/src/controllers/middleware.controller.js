import Middleware from '../models/middleware.model.js';
import generatePassword from 'generate-password';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import {getIo, getAdminSocketMap} from "../socket.js"

const createMiddleware = async (req, res) => {
    try {
        const { name, description, uuid } = req.body;
        const ip = req.ip;

        const middleware = new Middleware({
            name: name,
            description: description,
            uuid: uuid,
            IP: ip.toString()
        });

        const savedMiddleware = await middleware.save();
        try{
            const io = getIo()
            const adminSocketMap = getAdminSocketMap();
            adminSocketMap.forEach((value, key) => {
                io.to(value).emit('newMiddleware', savedMiddleware);
            });
        }
        catch (error){
            console.log(error)
        }

        res.status(201).json(savedMiddleware.name, savedMiddleware.uuid);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const loginMiddleware = async (req, res) => {
    try {
        const { uuid, password } = req.body;

        const middleware = await Middleware.findByPk(uuid);
        const validPassword = await argon2.verify(middleware.password, password);
        if (validPassword) {
            const payload = { id: middleware.uuid };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '4d' });
            res.status(201).json(token);
        } else {
            res.status(401).json({ error: 'Invalid password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }   
};

const getAllMiddlewares = async (req, res) => {
    try {
        const middlewares = await Middleware.findAll({
            attributes: ['uuid', 'name', 'status']
        });

        res.status(200).json(middlewares);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getMiddlewareById = async (req, res) => {
    try {
        const { uuid } = req.params;

        const middleware = await Middleware.findByPk(uuid);

        res.status(200).json(middleware);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateMiddlewareById = async (req, res) => {
    try {
        const { uuid } = req.params;
        const { status } = req.body;

        const middleware = await Middleware.findByPk(uuid);

        if (middleware.status !== 'Accepted' && status === 'Accepted') {
            var passwordGen=generatePassword.generate(
                {
                    length: 64,
                    numbers: true,
                    symbols: true,
                    strict: true
                },
            );
        }

        await middleware.update({status: status, password: passwordGen}, {
            where: { uuid: uuid }
        });

        // Return the updated middleware as the response
        res.status(200).json({"password":passwordGen});
    } catch (error) {
        // Handle any errors that occur during the update process
        res.status(500).json({ error: error.message });
    }
};

// Delete a middleware by ID
const deleteMiddlewareById = async (req, res) => {
    try {
        // Get the middleware ID from the request parameters
        const { id } = req.params;

        // Find the middleware by ID in the database and delete it
        await Middleware.findByIdAndDelete(id);

        // Return a success message as the response
        res.status(200).json({ message: 'Middleware deleted successfully' });
    } catch (error) {
        // Handle any errors that occur during the deletion process
        res.status(500).json({ error: error.message });
    }
};


export default {
    createMiddleware,
    getAllMiddlewares,
    getMiddlewareById,
    updateMiddlewareById,
    deleteMiddlewareById,
    loginMiddleware
};
