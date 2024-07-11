import { Server } from 'socket.io';
import { checkBlacklistSocket, getUserFromTokenSocket } from "./auth.js";
import jwt from 'jsonwebtoken';
import middleware from './models/middleware.model.js';

let io;
let userSocketMap = new Map();
let adminSocketMap = new Map(); 

export function startServer(server) {
  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('authenticate', async (token) => {
      try {
        const isBlacklisted = checkBlacklistSocket(token);
        if (isBlacklisted) {
          throw new Error('Token is blacklisted');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await getUserFromTokenSocket(decoded);
        if (!user) {
          throw new Error('User not found');
        }
        if (user.user_type == 'admin') {
          adminSocketMap.set(user.id, socket.id);
        }
        else{
          userSocketMap.set(user.id, socket.id);
        }
        
      } catch (error) {
        console.error('Failed to authenticate user:', error);
      }
    });

    socket.on('jobUpdate', (job_data) => {
      io.emit('jobUpdate', job_data)
    })

    socket.on('nodeUpdate', (node_data) => {
      io.emit('nodeUpdate', node_data)
    })

    socket.on('newNode', (node_data) => {
      io.emit('newNode', node_data)
    })

    socket.on('newMiddleware', (middleware_data) => {
      io.emit('newMiddleware', middleware_data)
    })

    socket.on('disconnect', () => {
      console.log('a user disconnected');
      userSocketMap.forEach((value, key) => {
        if (value === socket.id) {
          userSocketMap.delete(key);
        }
      });
      adminSocketMap.forEach((value, key) => {
        if (value === socket.id) {
          adminSocketMap.delete(key);
        }
      });
    });
  });
  return io;
}

export function getIo() {
  return io;
}
export function getUserSocketMap() {
  return userSocketMap;
}
export function getAdminSocketMap() {
  return adminSocketMap;
}