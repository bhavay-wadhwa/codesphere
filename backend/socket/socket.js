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
            //Join the specified room

            socket.join(roomId);
            socket.roomId = roomId;
            await addMember({email: socket.user.email, roomId: roomId});
            
            // Fetch room state and send initial shared editor/cursor state to the joining user
            try {
                const room = await Room.findById(roomId).populate('members editors');
                // assign a color for the joining user (simple hash)
                const colorPalette = ['#e6194b','#3cb44b','#ffe119','#4363d8','#f58231','#911eb4','#46f0f0','#f032e6','#bcf60c','#fabebe'];
                const color = colorPalette[Math.abs(hashCode(socket.user.id)) % colorPalette.length];

                // add cursor entry for user if not present
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
                    isLocked: room.isLocked || false,
                    ended: room.ended || false,
                });

                socket.to(roomId).emit('userJoined', {
                    userName: socket.user.name,
                });
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
                if (room?.isLocked) {
                    const isAdmin = room.admin?.toString() === userId;
                    const isEditor = room.editors?.map(String).includes(userId);
                    if (!isAdmin && !isEditor) {
                        socket.emit('actionDenied', { reason: 'Room is locked' });
                        return;
                    }
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

                // Permission: admin or editor allowed to run; if not locked, anyone in members can run
                const isAdmin = room.admin?.toString() === userId;
                const isEditor = room.editors?.map(String).includes(userId);
                const isMember = room.members?.map(String).includes(userId);

                if (room.isLocked && !isAdmin && !isEditor) {
                    return socket.emit('actionDenied', { reason: 'Run denied - room is locked' });
                }

                if (!isMember && !isAdmin && !isEditor) {
                    return socket.emit('actionDenied', { reason: 'Not a member of room' });
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

                // add to members/editors
                await Room.findByIdAndUpdate(roomId, { $addToSet: { members: user._id, editors: user._id } });
                io.to(roomId).emit('accessChanged', { userId: user._id, addedAs: 'editor' });
            } catch (err) {
                console.error('give-access error:', err.message);
            }
        })

        socket.on('remove-user', async (data) => {
            const { roomId, userId: targetId } = data;
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can remove users' });

                await Room.findByIdAndUpdate(roomId, { $pull: { members: targetId, editors: targetId } });
                io.to(roomId).emit('userRemoved', { userId: targetId });
            } catch (err) {
                console.error('remove-user error:', err.message);
            }
        })

        socket.on('lock-editor', async (data) => {
            const { roomId, lock } = data; // lock: true|false
            try {
                const room = await Room.findById(roomId);
                if (!room) return;
                if (room.admin?.toString() !== socket.user.id) return socket.emit('actionDenied', { reason: 'Only owner can lock/unlock' });

                room.isLocked = !!lock;
                await room.save();
                io.to(roomId).emit(room.isLocked ? 'roomLocked' : 'roomUnlocked', { by: socket.user.name });
            } catch (err) {
                console.error('lock-editor error:', err.message);
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
            await removeMember({email: socket.user.email, roomId: socket.roomId});
            io.to(socket.roomId).emit('userLeft');
        })
    })
}
