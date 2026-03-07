require("dotenv").config(); // Must be first to load API keys
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Route Imports
const videoRoutes = require('./routes/videoRoutes');
const authRoutes = require("./routes/auth");

const app = express();
const server = http.createServer(app);

/* ========================
   1. Middleware 
======================== */
app.use(express.json()); // Essential for parsing JSON bodies from Postman/Frontend
app.use(cors({
  origin: "*", // Allows Docker containers and local dev to communicate
  credentials: true
}));

/* ========================
   2. MongoDB Connection
======================== */
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("✅ MongoDB Atlas Connected!"))
.catch(err => console.error("❌ MongoDB Error:", err.message));

/* ========================
   3. Gemini AI Setup
======================== */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const aiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

/* ========================
   4. API Routes
======================== */

// Video and Auth Routes
app.use('/api/video', videoRoutes);
app.use("/api/auth", authRoutes);

// Gemini Summarize Endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { chatHistory = [], code = "" } = req.body;
    const trimmedChat = chatHistory.slice(-20);

    const prompt = `
      Analyze the following study session.
      Chat: ${JSON.stringify(trimmedChat)}
      Code: ${code}
      Return ONLY valid JSON:
      {
        "summary": "One paragraph summary",
        "flashcards": [
          { "question": "string", "answer": "string" }
        ]
      }
    `;

    const result = await aiModel.generateContent(prompt);
    const response = await result.response;
    let text = response.text().trim();

    // Clean markdown code blocks if the AI includes them
    text = text.replace(/```json|```/g, "").trim();

    res.json(JSON.parse(text));
  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    res.status(500).json({ error: "AI Generation Failed" });
  }
});

/* ========================
   5. Socket.IO (Real-time Sync)
======================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const roomCode = {}; // Temporary in-memory storage for room code

io.on("connection", (socket) => {
  console.log(`🔌 User connected: ${socket.id}`);

  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId);
    if (!roomCode[roomId]) {
      roomCode[roomId] = "";
    }
    socket.emit("initial_code", roomCode[roomId]);
  });

  socket.on("code_update", ({ roomId, code }) => {
    roomCode[roomId] = code;
    socket.to(roomId).emit("code_update", code);
  });

  socket.on("pass_token", ({ roomId, targetSocketId }) => {
    io.to(roomId).emit("token_passed", targetSocketId);
  });

  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

/* ========================
   6. Start Server
======================== */
const PORT = process.env.PORT || 5000; // Using 5000 to match Docker config
server.listen(PORT, () => {
  console.log(`🚀 PeerSync Backend live on port ${PORT}`);
});