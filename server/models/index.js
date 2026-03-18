const mongoose = require("mongoose");

// 1. User Schema: For storing account info
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// 2. Room Schema: For active or saved coding rooms
const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    owner: { type: String }, // Email or ID of the creator
    allowedUsers: [String],  // List of emails
    lastCode: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

// 3. SessionLog Schema: For storing AI Summaries and Transcripts
const SessionLogSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    fullTranscript: { type: String, default: "" },
    generatedSummary: { type: String },
    generatedFlashcards: [
        { q: String, a: String }
    ],
    logic: { type: String },
    approach: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Room = mongoose.model("Room", RoomSchema);
const SessionLog = mongoose.model("SessionLog", SessionLogSchema);

module.exports = { User, Room, SessionLog };