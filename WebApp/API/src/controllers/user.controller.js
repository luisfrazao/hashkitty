import passport from 'passport';
import models from "../models/index.js";
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import * as OTPAuth  from 'otpauth';
import QRCode from 'qrcode';
import { addToBlacklist } from '../auth.js';
import { encrypt,decrypt } from '../encrypt.js';
const { user } = models;


// Controller for user registration
export const register = async (req, res, next) => {
    try {
        const { username, email ,password } = req.body;

        const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        const existingUserByUsername = await user.findOne({ where: { username } });
        if (existingUserByUsername) {
            return res.status(400).json({ message: 'Username already in use' });
        }

        const existingUserByEmail = await user.findOne({ where: { email } });
        if (existingUserByEmail) {
            return res.status(400).json({ message: 'Email already in use' });
        }

        const newUser = new user({ email, username, password, user_type: 'user' });
        try {
            await newUser.validate();
            await newUser.save();
        }
        catch (error) {
            return res.status(400).json({ message: error.message });
        }
        res.status(201).json({ message: 'Registration successful' });
    } catch (error) {
        next(error);
    }
};

// Controller for user login
export const login = async (req, res, next) => {
    try {
        const { username, password } = req.body;
        const userRecord = await user.findOne({ where: { username } });
        if (!userRecord) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        const validPassword = await argon2.verify(userRecord.password, password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!userRecord.totpSecret) {
            const payload = { id: userRecord.id };
            const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });
            return res.json({ token });
        } else {
            return res.json({ message: 'TOTP required', userId: userRecord.id });
        }
    } catch (error) {
        next(error);
    }
};

// Controller for user profile
export const profile = async (req, res, next) => {
    try {
        const profile = await user.findByPk(req.user.id);
        profile.totpSecret = true ? profile.totpSecret != null : null;
        res.status(200).json({username: profile.username, email: profile.email, type: profile.user_type, totp: profile.totpSecret});
    } catch (error) {
        next(error);
    }
};

// Controller to get all users to admins
export const getAllUsers = async (req, res, next) => {
    try {
        if (req.user.user_type != 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        let users = await user.findAll();
        let admins = users.filter(user => user.user_type == 'admin');
        users = users.filter(user => user.user_type == 'user');
        res.status(200).json({users, admins});
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// Controller for user logout
export const logout = async (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1]; // Assuming your token is in the format: Bearer <token>
        addToBlacklist(token);
        res.json({ message: 'User logged out successfully' });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

// Controller for deleting a user
export const deleteUser = async (req, res, next) => {
    try {
        if (req.user.user_type != 'admin') {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        const { id } = req.params;
        const userRecord = await user.findOne({ where: { id } });
        if (!userRecord) {
            return res.status(404).json({ message: 'User not found' });
        }
        await userRecord.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

/*export const updateUser = async (req, res, next) => {
    try {
        const { username } = req.params;
        const { password } = req.body;
        const userRecord = await user.findOne({ where: { username } });
        if (!userRecord) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (password) {
            userRecord.password = password;
            await userRecord.save();
            res.json({ message: 'Password updated successfully' });
        } else {
            res.status(400).json({ message: 'No password provided' });
        }
    } catch (error) {
        next(error);
    }
};*/

export const changePassword = async (req, res) => {
    try {
        const userR  = req.user;
        const { oldPassword, newPassword } = req.body;
        const userRecord = await user.findByPk(userR.id);
        if (!userRecord) {
            return res.status(404).json({ message: 'User not found' });
        }
        const validPassword = await argon2.verify(userRecord.password, oldPassword);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        await userRecord.update({ password: newPassword });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

//controller to add totp to user
export const addTotp = async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(400).json({ message: 'No User found' });
    }
    try {
        const secret = new OTPAuth.Secret();
        const otp = new OTPAuth.TOTP({
            issuer: 'Hashkitty',
            label: user.username,
            secret: secret,
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });

        const otpauth = otp.toString();
        const qrCodeUrl = await QRCode.toDataURL(otpauth);

        user.totpSecret = encrypt(secret.base32);
        await user.save();

        res.json({ qrCodeUrl });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

//controller to verify totp
export const verifyTotp = async (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'No userId provided' });
    }

    const userFound = await user.findOne({ where: { username } });
    if (!userFound) {
        return res.status(400).json({ message: 'No User found' });
    }

    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        const secret = decrypt(userFound.totpSecret);
        const otp = new OTPAuth.TOTP({
            issuer: 'Hashkitty',
            label: userFound.username,
            secret:  OTPAuth.Secret.fromBase32(secret),
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });

        let isValid = otp.validate({ token, window: 1 });
        if (isValid === null) {
            return res.status(400).json({ message: 'Invalid token' });
        }
        const jwtToken = jwt.sign({ id: userFound.id }, process.env.JWT_SECRET, { expiresIn: '12h' });
        res.json({ message: 'Token is valid', token: jwtToken });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: "Internal server error" });
    }
};

//first verify totp
export const firstVerifyTotp = async (req, res) => {
    const user = req.user;
    if (!user) {
        return res.status(400).json({ message: 'No User found' });
    }

    const { token } = req.body;
    if (!token) {
        return res.status(400).json({ message: 'No token provided' });
    }

    try {
        const secret = decrypt(user.totpSecret);
        const otp = new OTPAuth.TOTP({
            issuer: 'Hashkitty',
            label: user.username,
            secret:  OTPAuth.Secret.fromBase32(secret),
            algorithm: 'SHA1',
            digits: 6,
            period: 30,
        });

        let isValid = otp.validate({ token, window: 1 });
        if (isValid === null) {
            return res.status(400).json({ valid: false });
        }
        res.json({ valid: true });
    } catch (error) {
        res.status(500).json({ message: "Internal server error" });
    }
};

//remove totp
export const removeTotp = async (req, res) => {
    const user = req.user;

    if (!user) {
        return res.status(400).json({ message: 'No User found' });
    }

    if (!user.totpSecret) {
        return res.status(400).json({ message: 'The User has no TOTP' });
    }

    user.totpSecret = null;
    await user.save();
    res.json({ message: 'TOTP removed successfully' });
};

export default { register, login, profile, logout, deleteUser, /*updateUser*/ changePassword, getAllUsers, addTotp, verifyTotp, removeTotp, firstVerifyTotp };