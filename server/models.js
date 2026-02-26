const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  passwordHash: {
    type: String,
    required: true
  }
}, { timestamps: true });

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
  }
}, { timestamps: true });

const sessionLogSchema = new mongoose.Schema({
  roomId: {
    type: String,
    required: true
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
  generatedFlashcards: [{
    question: { type: String },
    answer: { type: String }
  }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
const Room = mongoose.model('Room', roomSchema);
const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

module.exports = { User, Room, SessionLog };