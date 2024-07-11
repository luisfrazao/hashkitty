import jwt from 'jsonwebtoken';
import models from './models/index.js';
let jwtBlacklist = {};

export const addToBlacklist = (token) => {
    jwtBlacklist[token] = true;
};

export const checkBlacklist = (req, res, next) => {
    const token = req.headers.authorization.split(' ')[1];
    if (jwtBlacklist[token]) {
        return res.status(401).json({ message: 'Token is no longer valid' });
    }
    next();
};

export const checkBlacklistSocket = (token) => {
    if (jwtBlacklist[token]) {
        return true;
    }
    return false;
}

export const getUserFromToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const userRecord = await models.user.findOne({ where: { id: payload.id } });
        if (!userRecord) {
            const middlewareRecord = await models.middleware.findOne({ where: { uuid: payload.id } });
            if (middlewareRecord) {
                req.middleware = middlewareRecord;
                return next();
            }
            console.log('Record not found');
            return res.status(404).json({ message: 'Record not found' });
        }
        req.user = userRecord;
        next();
    } catch (error) {
        next(error);
    }
};

export const getUserFromTokenSocket = async (payload) => {
    try {
        const userRecord = await models.user.findOne({ where: { id: payload.id } });
        return userRecord;
    } catch (error) {
        console.error('Failed to authenticate user:', error);
        return null;
    }
}