const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

/* ========================
   Middleware
======================== */
app.use(cors({
  origin: "*",
  credentials: true
}));

app.use(express.json());

/* ========================
   MongoDB Connection
======================== */
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log("✅ MongoDB Atlas Connected!"))
.catch(err => console.error("❌ MongoDB Error:", err.message));

/* ========================
   Start Server
======================== */
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 PeerSync Backend live on port ${PORT}`);
});

/* ========================
   Routes
======================== */
app.use("/api/auth", require("./routes/auth"));

/* ========================
   Gemini Setup (NEW SDK)
======================== */
const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

/* ========================
   Summarize Endpoint
======================== */
app.post("/api/summarize", async (req, res) => {
  try {
    const { chatHistory = [], code = "" } = req.body;
    const trimmedChat = chatHistory.slice(-20);

    const prompt = `
Analyze the following study session.

Chat:
${JSON.stringify(trimmedChat)}

Code:
${code}

Return ONLY valid JSON:
{
  "summary": "One paragraph summary",
  "flashcards": [
    { "question": "string", "answer": "string" }
  ]
}
`;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt
    });

    let text = result.text.trim();

    // Remove markdown wrapping if model adds it
    text = text.replace(/```json|```/g, "").trim();

    res.json(JSON.parse(text));

  } catch (error) {
    console.error("❌ Gemini Error:", error.message);
    res.status(500).json({ error: "AI Generation Failed" });
  }
});

/* ========================
   Socket.IO Setup
======================== */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Room-specific code storage
const roomCode = {};

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