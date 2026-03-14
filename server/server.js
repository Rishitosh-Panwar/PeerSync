require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios"); 
const jwt = require("jsonwebtoken");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Import your verified models
const { User, Room, SessionLog } = require("./models"); 

const app = express();
const server = http.createServer(app);

app.use(express.json());

// FIXED CORS: Added strict matching for Vite ports
app.use(cors({ 
  origin: ["http://localhost:5173", "http://localhost:5174"], 
  credentials: true 
}));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

// --- 1. JITSI JWT GENERATION (8x8 JaaS Fix) ---
app.get("/api/jitsi-token", (req, res) => {
  try {
    if (!process.env.JITSI_PRIVATE_KEY) throw new Error("Private Key missing in .env");

    const privateKey = process.env.JITSI_PRIVATE_KEY.replace(/\\n/g, '\n');
    const appId = "vpaas-magic-cookie-8f291ebf52794eb5896baaed63b01738";
    const keyId = "vpaas-magic-cookie-8f291ebf52794eb5896baaed63b01738/129679";
    
    const now = Math.floor(Date.now() / 1000);

    const token = jwt.sign({
      aud: 'jitsi',
      iss: 'chat',
      sub: appId,
      room: '*', 
      iat: now,
      nbf: now,
      exp: now + (5 * 60 * 60), 
      context: {
        user: { name: "PeerSync Moderator", affiliation: "owner", moderator: true },
        features: { recording: true, livestreaming: true, 'screen-sharing': true, transcription: true }
      }
    }, privateKey, { 
        algorithm: 'RS256', 
        header: { kid: keyId } 
    });

    res.json({ token });
  } catch (error) {
    console.error("❌ JWT Error:", error.message);
    res.status(500).json({ error: "Failed to generate Jitsi Token" });
  }
});

// --- 2. AUTHENTICATION (Mock) ---
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (email && password) {
    return res.status(200).json({ 
      token: "valid-session-token", 
      user: { email }, 
      message: "Login Successful" 
    });
  }
  res.status(400).json({ error: "Invalid credentials" });
});

// --- 3. CODE EXECUTION (Piston API) ---
app.post("/api/execute", async (req, res) => {
  const { language, code } = req.body;
  
  const runtimeMap = { 
    "javascript": { name: "javascript", version: "18.15.0" }, 
    "python": { name: "python", version: "3.10.0" }, 
    "java": { name: "java", version: "15.0.2" },
    "cpp": { name: "c++", version: "10.2.0" } 
  };
  
  const selected = runtimeMap[language];
  if (!selected) return res.status(400).json({ error: "Unsupported language" });

  try {
    const response = await axios.post("https://emkc.org/api/v2/piston/execute", {
      language: selected.name,
      version: selected.version,
      files: [{ content: code }]
    }, { timeout: 10000 });

    res.json(response.data);
  } catch (error) {
    console.error("Execution Error:", error.message);
    res.status(500).json({ error: "Backend could not reach Execution Engine." });
  }
});

// --- 4. AI CONFIG & SUMMARY ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_MODEL = "gemini-1.5-flash"; 

app.post("/api/summarize", async (req, res) => {
  const { roomId, transcript = "General coding session", code = "" } = req.body;
  
  const prompt = `Analyze this code session.
  1. Identify the Language.
  2. Explain the Logic (step-by-step).
  3. Explain the Approach (Algorithm or Pattern used).
  4. Provide 3-5 Flashcards for key concepts.
  
  Code: ${code}
  Transcript: ${transcript}

  Return ONLY a raw JSON object with these keys: "summary", "logic", "approach", "flashcards" (array of {q, a}).`;

  try {
    const model = genAI.getGenerativeModel({ 
        model: PRIMARY_MODEL, 
        generationConfig: { responseMimeType: "application/json" } 
    });
    const result = await model.generateContent(prompt);
    const data = JSON.parse(result.response.text());

    await SessionLog.findOneAndUpdate(
      { roomId },
      { 
        generatedSummary: data.summary, 
        generatedFlashcards: data.flashcards, 
        fullTranscript: transcript
      },
      { upsert: true }
    );

    res.json(data);
  } catch (error) {
    console.error("❌ AI Error:", error);
    res.status(500).json({ error: "AI Generation Failed" });
  }
});

// --- 5. SOCKET.IO (COLLABORATION & TOKEN PASSING) ---
const io = new Server(server, { 
  cors: { origin: ["http://localhost:5173", "http://localhost:5174"] } 
});

const activeRooms = {}; 

io.on("connection", (socket) => {
  // Join Room
  socket.on("join_room", async ({ roomId }) => {
    socket.join(roomId);
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = { 
        code: "// Welcome to PeerSync Lab", 
        driver: socket.id, 
        language: "javascript" 
      };
      await Room.findOneAndUpdate({ roomId }, { currentCodeBase: activeRooms[roomId].code }, { upsert: true });
    }
    socket.emit("initial_code", activeRooms[roomId].code);
    io.to(roomId).emit("token_passed", activeRooms[roomId].driver);
  });

  // Code Sync
  socket.on("code_update", async ({ roomId, code }) => {
    if (activeRooms[roomId]?.driver === socket.id) {
      activeRooms[roomId].code = code;
      socket.to(roomId).emit("code_update", code);
      await Room.updateOne({ roomId }, { currentCodeBase: code });
    }
  });

  // Language Sync
  socket.on("language_change", ({ roomId, language }) => {
    if (activeRooms[roomId]?.driver === socket.id) {
      activeRooms[roomId].language = language;
      socket.to(roomId).emit("receive_language", language);
    }
  });

  // --- DRIVER REQUEST HANDSHAKE ---
  
  // 1. Participant requests control
  socket.on("request_driver", ({ roomId, requesterName }) => {
    const driverId = activeRooms[roomId]?.driver;
    if (driverId) {
      io.to(driverId).emit("driver_request_received", { 
        requesterId: socket.id, 
        requesterName 
      });
    }
  });

  // 2. Current Driver accepts request
  socket.on("accept_driver_request", ({ roomId, requesterId }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].driver = requesterId; 
      io.to(roomId).emit("token_passed", requesterId); 
    }
  });

  // --- UI & DATA SYNC ---

  socket.on("share_summary", ({ roomId, aiData }) => {
    socket.to(roomId).emit("receive_summary", aiData);
  });

  socket.on("share_output", ({ roomId, output }) => {
    socket.to(roomId).emit("receive_output", output);
  });

  socket.on("sync_layout", ({ roomId, isVideoMaximized }) => {
    socket.to(roomId).emit("receive_layout", isVideoMaximized);
  });

  socket.on("send_subtitle", ({ roomId, text, isFinal }) => {
    socket.to(roomId).emit("receive_subtitle", { text, isFinal });
  });

  socket.on("disconnect", () => {
    // If driver disconnects, you could implement an auto-assign logic here
  });
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Backend live on port ${PORT}`));