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
    // If locked, only `admin` and users in `editors` can edit/run code
    isLocked: {
        type: Boolean,
        default: false,
    },
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
    createdAt: {
        type: Date,
        default: Date.now(),
        expires: 10800,
    }
});

export const Room = mongoose.model("Room", roomSchema);