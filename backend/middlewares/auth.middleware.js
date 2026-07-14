import jwt from 'jsonwebtoken';
import { getClearCookieOptions } from '../config/runtime.js';

const appAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if(!token) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded) {
            res.clearCookie('token', getClearCookieOptions());
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.log("Error in appAuthMiddleware: ", error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
}

const socketAuthMiddleware = async (socket, next) => {
    try {
        const cookie = socket?.handshake?.headers?.cookie || '';
        const token = cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1];

        if(!token) {
            return next(new Error('Authentication error: Token not found'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if(!decoded) {
            return next(new Error('Authentication error: Invalid token'));
        }
        socket.user = decoded;
        next();
    } catch (error) {
        console.log("Error in socketAuthMiddleware: ", error);
        return next(new Error('Authentication error: Internal server error'));
    }
}

export { appAuthMiddleware, socketAuthMiddleware };
