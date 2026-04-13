const mongoose = require("mongoose");

// User Schema with OTP verification
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String }, // Optional for SMS OTP
    isVerified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    lastLogin: { type: Date },
    refreshToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const RoomSchema = new mongoose.Schema({
    roomId: { type: String, required: true, unique: true },
    owner: { type: String },
    allowedUsers: [String],
    lastCode: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const SessionLogSchema = new mongoose.Schema({
    roomId: { type: String, required: true },
    fullTranscript: { type: String, default: "" },
    generatedSummary: { type: String },
    generatedFlashcards: [{ q: String, a: String }],
    logic: { type: String },
    approach: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model("User", UserSchema);
const Room = mongoose.model("Room", RoomSchema);
const SessionLog = mongoose.model("SessionLog", SessionLogSchema);

module.exports = { User, Room, SessionLog };