import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    admin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    members: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    // Explicit editors list: users who can type/run. Members not in this list are viewers.
    editors: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        }
    ],
    // Mark when session has ended
    ended: {
        type: Boolean,
        default: false,
    },
    isVisible: {
        type: Boolean,
        required: true,
    },
    isMsgEnable: {
        type: Boolean,
        required: true,
    },
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Message",
        }
    ],
    // Current shared editor content for the room
    currentCode: {
        type: String,
        default: "",
    },
    // Current language in the shared editor
    currentLanguage: {
        type: String,
        default: "",
    },
    // Cursor info for live cursors
    cursors: [
        {
            user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            name: { type: String },
            color: { type: String },
            position: {
                line: { type: Number, default: 0 },
                ch: { type: Number, default: 0 }
            }
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 10800,
    }
});

export const Room = mongoose.model("Room", roomSchema);