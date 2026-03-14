const mongoose = require('mongoose');

// --- User Schema ---
// Stores account details and authentication data
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  }
}, { timestamps: true });

// --- Room Schema ---
// Manages the real-time state of a collaborative session
const roomSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    unique: true
  },
  activeDriverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  currentCodeBase: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'javascript'
  }
}, { timestamps: true });

// --- Session Log Schema ---
// Stores the "Brain" of the session: Transcripts, AI Summaries, and Flashcards
const sessionLogSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true,
    index: true // Optimized for faster searching by Room ID
  },
  // Added: Necessary to store the voice-to-text data for AI Analysis
  fullTranscript: {
    type: String,
    default: ''
  },
  chatHistory: [{
    sender: { type: String },
    message: { type: String },
    timestamp: { type: Date, default: Date.now }
  }],
  generatedSummary: {
    type: String,
    default: ''
  },
  // Structured for easy mapping in the Frontend
  generatedFlashcards: [{
    question: { type: String },
    answer: { type: String }
  }],
  youtubePath: {
    type: String,
    default: ''
  }
}, { timestamps: true });

// Create the Models
const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

// Export for use in server.js
module.exports = { User, Room, SessionLog };