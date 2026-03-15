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

// --- 3. CODE EXECUTION (Self-Hosted Piston) ---
app.post("/api/execute", async (req, res) => {
  const { language, code } = req.body;
  
  // NOTE: Ensure these versions are actually INSTALLED in your Piston container
  // Run: docker exec -it piston_api ./piston install nodejs 18.15.0
  const runtimeMap = { 
    "javascript": { name: "node", version: "18.15.0" }, 
    "python": { name: "python", version: "3.10.0" }, 
    "java": { name: "java", version: "15.0.2" },
    "cpp": { name: "gcc", version: "10.2.0" } 
  };
  
  const selected = runtimeMap[language];
  if (!selected) return res.status(400).json({ error: "Unsupported language" });

  try {
    // FIX: Changed hostname from 'piston' to 'piston_api' to match your Docker container name
    const PISTON_URL = process.env.PISTON_URL || "http://piston_api:2000/api/v2/execute";
    
    const response = await axios.post(PISTON_URL, {
      language: selected.name,
      version: selected.version,
      files: [{ 
        name: selected.name === "java" ? "Main.java" : "index", 
        content: code 
      }]
    }, { timeout: 10000 });

    res.json(response.data);
  } catch (error) {
    if (error.response) {
      // Piston actually replied, but with an error (like 400 or 500)
      console.error("Piston responded with error:", error.response.data);
      res.status(error.response.status).json({ 
        error: "Piston Engine Error", 
        details: error.response.data 
      });
    } else {
      // The Piston container couldn't be reached at all
      console.error("Could not reach Piston container:", error.message);
      res.status(500).json({ 
        error: "Execution Engine Unreachable", 
        details: error.message 
      });
    }
  }
});

// --- 4. AI CONFIG & SUMMARY ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_MODEL = "gemini-1.5-flash-latest"; 

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

// --- 5. SOCKET.IO (COLLABORATION) ---
const io = new Server(server, { 
  cors: { origin: ["http://localhost:5173", "http://localhost:5174"] } 
});

const activeRooms = {}; 

io.on("connection", (socket) => {
  socket.on("join_room", async ({ roomId }) => {
    socket.join(roomId);
    
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = { 
        code: "// Welcome to PeerSync Lab", 
        driver: socket.id, 
        language: "javascript",
        consoleHeight: 200 
      };
    }
    
    socket.emit("initial_code", activeRooms[roomId].code);
    io.to(roomId).emit("token_passed", activeRooms[roomId].driver);
    socket.emit("receive_console_height", activeRooms[roomId].consoleHeight);
  });

  socket.on("code_update", ({ roomId, code }) => {
    if (activeRooms[roomId]?.driver === socket.id) {
      activeRooms[roomId].code = code;
      socket.to(roomId).emit("code_update", code);
    }
  });

  socket.on("update_console_height", ({ roomId, height }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].consoleHeight = height;
      socket.to(roomId).emit("receive_console_height", height);
    }
  });

  socket.on("accept_driver_request", ({ roomId, requesterId }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].driver = requesterId; 
      io.to(roomId).emit("token_passed", requesterId); 
    }
  });

  socket.on("disconnect", () => {
    // Optional driver reassignment logic here
  });
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Backend live on port ${PORT}`));