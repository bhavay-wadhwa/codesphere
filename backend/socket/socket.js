import { socketAuthMiddleware } from '../middlewares/auth.middleware.js';

import { addMember, removeMember } from '../controllers/roomController.js';
import { saveMessage } from '../controllers/messageController.js';
import { codeSave } from '../controllers/codeController.js';
import { submitToJudge0, getJudge0LanguageId } from '../controllers/codeController.js';
import { Room } from '../models/Room.model.js';
import { User } from '../models/User.model.js';

export const initSocket = (io) => {
    io.use(socketAuthMiddleware);   // socket middleware

    io.on('connection', (socket) => {
        console.log('user connected', socket?.user);

        // small hash function to map user id to color index
        function hashCode(str) {
            let hash = 0;
            for (let i = 0; i < str.length; i++) {
                const chr = str.charCodeAt(i);
                hash = ((hash << 5) - hash) + chr;
                hash |= 0;
            }
            return hash;
        }

        socket.on('join-room', async (roomId) => { 
            // Join the specified room
            socket.join(roomId);
            socket.roomId = roomId;
            await addMember({ email: socket.user.email, roomId });

            try {
                const room = await Room.findById(roomId).populate('members editors');
                if (!room) return;

                const colorPalette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
                const color = colorPalette[Math.abs(hashCode(socket.user.id)) % colorPalette.length];

                const existingCursor = room.cursors?.find(c => c.user?.toString() === socket.user.id);
                if (!existingCursor) {
                    room.cursors = room.cursors || [];
                    room.cursors.push({ user: socket.user.id, name: socket.user.name, color, position: { line: 0, ch: 0 } });
                    await room.save();
                }

                socket.emit('initialState', {
                    code: room.currentCode || '',
                    language: room.currentLanguage || room.language,
                    cursors: room.cursors || [],
                    members: room.members || [],
                    editors: (room.editors || []).map(m => m.toString()),
                    admin: room.admin?.toString(),
                    isMsgEnable: room.isMsgEnable || false,
                    ended: room.ended || false,
                });

                socket.to(roomId).emit('userJoined', {
                    userName: socket.user.name,
                });

                try {
                    const updatedRoom = await Room.findById(roomId).populate('members');
                    const members = (updatedRoom?.members || []).map(m => ({ _id: m._id, firstName: m.firstName, lastName: m.lastName, email: m.email, imageUrl: m.imageUrl }));
                    const editors = (updatedRoom?.editors || []).map((id) => id.toString());
                    const admin = updatedRoom?.admin?.toString();
                    io.to(roomId).emit('members-updated', { members, editors, admin, isMsgEnable: updatedRoom.isMsgEnable || false });
                } catch (err) {
                    console.error('emit members-updated error:', err.message);
                }
            } catch (err) {
                console.error('join-room error:', err.message);
            }
        })

        socket.on('sendMessage', async (data) => {
            const { roomId, message } = data;
            await saveMessage({message, roomId, userId: socket.user.id});

            socket.to(roomId).emit('receiveMessage');
        })

        // Receive full editor content updates from clients (keystrokes or autosave)
        socket.on('editor-change', async (data) => {
            const { code, roomId, language } = data;
            const userId = socket.user.id;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;

                const isAdmin = room.admin?.toString() === userId;
                const isEditor = room.editors?.map(String).includes(userId);
                if (!isAdmin && !isEditor) {
                    socket.emit('actionDenied', { reason: 'Only room editors can edit code' });
                    return;
                }

                // Update shared code and language
                room.currentCode = code ?? room.currentCode;
                if (language) room.currentLanguage = language;
                await room.save();

                // Broadcast the update to other clients
                socket.to(roomId).emit('receiveCode', { code: room.currentCode, userId: socket.user.id });
            } catch (err) {
                console.error('editor-change error:', err.message);
            }
        });

        // Live cursor updates
        socket.on('cursor-move', async (data) => {
            const { roomId, position } = data; // position: {line, ch}
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                room.cursors = room.cursors || [];
                const cursor = room.cursors.find(c => c.user?.toString() === socket.user.id);
                if (cursor) {
                    cursor.position = position;
                } else {
                    // assign color if missing
                    const colorPalette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
                    const color = colorPalette[Math.abs(hashCode(socket.user.id)) % colorPalette.length];
                    room.cursors.push({ user: socket.user.id, name: socket.user.name, color, position });
                }
                await room.save();

                // Broadcast cursor to others
                socket.to(roomId).emit('cursor-updated', { userId: socket.user.id, position, name: socket.user.name });
            } catch (err) {
                console.error('cursor-move error:', err.message);
            }
        });

        // Run code in Judge0 and broadcast results to all members
        socket.on('run-code', async (data) => {
            const { roomId, code, language, input } = data;
            const userId = socket.user.id;

            try {
                const room = await Room.findById(roomId);
                if (!room) return socket.emit('actionDenied', { reason: 'Room not found' });

                if (room.ended) return socket.emit('actionDenied', { reason: 'Session ended' });

                // Permission: only admin or editor may run code
                const isAdmin = room.admin?.toString() === userId;
                const isEditor = room.editors?.map(String).includes(userId);
                const isMember = room.members?.map(String).includes(userId);

                if (!isMember && !isAdmin && !isEditor) {
                    return socket.emit('actionDenied', { reason: 'Not a member of room' });
                }

                if (!isAdmin && !isEditor) {
                    return socket.emit('actionDenied', { reason: 'Only room editors can run code' });
                }

                const judge0LangId = getJudge0LanguageId(language);
                if (!judge0LangId) {
                    return socket.emit('actionDenied', { reason: `Language '${language}' is not supported` });
                }

                const exec = await submitToJudge0(judge0LangId, code, input || "");
                const runData = {
                    stdout: exec.stdout,
                    stderr: exec.stderr || exec.compile_output || "",
                    status: exec.status_description || null,
                };

                socket.to(roomId).emit('run-result', { run: runData, ranBy: socket.user.name });
                socket.emit('run-result', { run: runData, ranBy: socket.user.name });
            } catch (err) {
                console.error('run-code socket error:', err.message);
                socket.emit('run-error', { message: err.message });
            }
        })

        // Owner actions: give access, remove user, lock/unlock, end session
        socket.on('give-access', async (data) => {
            const { roomId, email } = data;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can give access' });

                const user = await User.findOne({ email });
                if (!user) return socket.emit('actionDenied', { reason: 'User not found' });

                await Room.findByIdAndUpdate(roomId, { $addToSet: { members: user._id, editors: user._id } });
                const updatedRoom = await Room.findById(roomId).populate('members');
                const members = (updatedRoom?.members || []).map(m => ({ _id: m._id, firstName: m.firstName, lastName: m.lastName, email: m.email, imageUrl: m.imageUrl }));
                const editors = (updatedRoom?.editors || []).map((id) => id.toString());
                const admin = updatedRoom?.admin?.toString();
                io.to(roomId).emit('members-updated', { members, editors, admin, isMsgEnable: updatedRoom.isMsgEnable || false });
                io.to(roomId).emit('accessChanged', { userId: user._id.toString(), addedAs: 'editor' });
            } catch (err) {
                console.error('give-access error:', err.message);
            }
        })

        socket.on('revoke-access', async (data) => {
            const { roomId, userId } = data;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can revoke access' });

                await Room.findByIdAndUpdate(roomId, { $pull: { editors: userId } });
                const updatedRoom = await Room.findById(roomId).populate('members');
                const members = (updatedRoom?.members || []).map(m => ({ _id: m._id, firstName: m.firstName, lastName: m.lastName, email: m.email, imageUrl: m.imageUrl }));
                const editors = (updatedRoom?.editors || []).map((id) => id.toString());
                const admin = updatedRoom?.admin?.toString();
                io.to(roomId).emit('members-updated', { members, editors, admin });
                io.to(roomId).emit('accessChanged', { userId: userId.toString(), removedAs: 'editor' });
            } catch (err) {
                console.error('revoke-access error:', err.message);
            }
        })

        socket.on('toggle-messages', async (data) => {
            const { roomId, enable } = data;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can change messaging settings' });

                room.isMsgEnable = !!enable;
                await room.save();

                const updatedRoom = await Room.findById(roomId).populate('members');
                const members = (updatedRoom?.members || []).map(m => ({ _id: m._id, firstName: m.firstName, lastName: m.lastName, email: m.email, imageUrl: m.imageUrl }));
                const editors = (updatedRoom?.editors || []).map((id) => id.toString());
                const admin = updatedRoom?.admin?.toString();
                io.to(roomId).emit('members-updated', { members, editors, admin, isMsgEnable: updatedRoom.isMsgEnable || false });
                io.to(roomId).emit('messageToggle', { by: socket.user.name, isMsgEnable: updatedRoom.isMsgEnable || false });
            } catch (err) {
                console.error('toggle-messages error:', err.message);
            }
        })

        socket.on('remove-user', async (data) => {
            const { roomId, userId: targetId } = data;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can remove users' });

                await Room.findByIdAndUpdate(roomId, { $pull: { members: targetId, editors: targetId, cursors: { user: targetId } } });
                const updatedRoom = await Room.findById(roomId).populate('members');
                const members = (updatedRoom?.members || []).map(m => ({ _id: m._id, firstName: m.firstName, lastName: m.lastName, email: m.email, imageUrl: m.imageUrl }));
                const editors = (updatedRoom?.editors || []).map((id) => id.toString());
                const admin = updatedRoom?.admin?.toString();
                io.to(roomId).emit('members-updated', { members, editors, admin, isMsgEnable: updatedRoom.isMsgEnable || false });
                io.to(roomId).emit('userRemoved', { userId: targetId });
                io.to(roomId).emit('userLeft', { userId: targetId });

                for (const [socketId, sock] of io.of("/").sockets) {
                    if (sock.user?.id === targetId && sock.roomId === roomId) {
                        sock.leave(roomId);
                        sock.emit('removedFromRoom', { roomId });
                    }
                }
            } catch (err) {
                console.error('remove-user error:', err.message);
            }
        })

        socket.on('end-session', async (data) => {
            const { roomId } = data;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can end session' });

                room.ended = true;
                await room.save();
                io.to(roomId).emit('sessionEnded', { by: socket.user.name });
            } catch (err) {
                console.error('end-session error:', err.message);
            }
        })

        socket.on('disconnect', async () => {
            try {
                const roomId = socket.roomId;
                if (!roomId) return;

                const stillConnected = Array.from(io.of("/").sockets.values()).some((sock) => {
                    return sock.id !== socket.id && sock.roomId === roomId && sock.user?.id === socket.user.id;
                });

                if (!stillConnected) {
                    await Room.findByIdAndUpdate(roomId, { $pull: { cursors: { user: socket.user.id } } });
                }

                io.to(roomId).emit('userLeft', { userId: socket.user.id });
            } catch (err) {
                console.error('disconnect error:', err.message);
            }
        })
    })
}
