import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoute from './routes/authRoute.js';
import userRoute from './routes/userRoute.js';
import contactRoute from './routes/contactRoute.js'
import roomRoute from './routes/roomRoute.js';
import messageRoute from './routes/messageRoute.js';
import codeRoute from './routes/codeRoute.js';

import { connectDB } from './config/database.js';
import { cloudinaryConfig } from './config/cloudinary.js';
import { getCorsOptions } from './config/runtime.js';

import { initSocket } from './socket/socket.js';

import './jobs/cleanUpJob.js';      // Import your cron job to run on server start

dotenv.config();
const PORT = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: getCorsOptions(),
});

initSocket(io);

app.use(cookieParser());
app.use(cors(getCorsOptions()));
app.use(express.json({ limit: '10mb' }));

app.get('/health', (req, res) => {
    res.status(200).json({ success: true, message: 'CodeSphere server is ready' });
});

app.use('/auth', authRoute);
app.use('/user', userRoute);
app.use('/contact', contactRoute);
app.use('/room', roomRoute);
app.use('/message', messageRoute);
app.use('/code', codeRoute);

if (process.env.SERVE_STATIC === 'true') {
    const frontendDist = path.resolve(__dirname, '../frontend/dist');
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
} else {
    app.get('/', (req, res) => res.send('CodeSphere server is ready'));
}

const startServer = async () => {
    try {
        await connectDB();
        cloudinaryConfig();

        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Server startup failed:', error.message);
        process.exit(1);
    }
};

startServer();
