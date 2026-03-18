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

// --- 1. JITSI JWT GENERATION ---
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
    }, privateKey, { algorithm: 'RS256', header: { kid: keyId } });

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

// --- 3. CODE EXECUTION (DYNAMIC FIX) ---
app.post("/api/execute", async (req, res) => {
  const { language, code } = req.body;
  const PISTON_BASE = "http://piston:2000/api/v2";
  const filename = language === "java" ? "Main.java" : "script";

  try {
    const runtimesResponse = await axios.get(`${PISTON_BASE}/runtimes`);
    const selected = runtimesResponse.data.find(r => 
      r.language === language.toLowerCase() || (r.aliases && r.aliases.includes(language.toLowerCase()))
    );

    if (!selected) {
      return res.status(400).json({ error: "Language not found" });
    }

    // --- FIX: Define requestData properly here ---
   const requestData = {
      language: selected.language,
      version: selected.version,
      files: [{ name: filename, content: code }],
      args: ["-Xmx512m", "-Xms128m", "-XX:TieredStopAtLevel=1"]
    };

    if (selected.language === 'java') {
      // These flags tell Java: "Don't optimize the code, just run it NOW."
      // This saves about 1 second of CPU time, which is exactly what we need.
      requestData.run_timeout = 10000; 
      requestData.args = [
        "-XX:TieredStopAtLevel=1",
        "-Xverify:none",
        "-Djava.awt.headless=true"
      ];
    }

    // We use a longer timeout on the axios call itself so the backend doesn't hang up
   const response = await axios.post(`${PISTON_BASE}/execute`, {
  language: "java",
  version: "15.0.2",
  files: [{ 
    name: "Main.java", 
    content: code 
  }],
  // We use "run_command" to override Piston's slow default behavior
  // This tells Java 15 to run the file directly in 'source mode'
  run_command: "java -XX:TieredStopAtLevel=1 -Xmx256m Main.java"
});

    const run = response.data.run;
    console.log("PISTON DEBUG:", run); 

    let result = "";
    if (run.output) {
      result = run.output;
    } else {
      result = (run.stdout || "") + (run.stderr || "");
    }

    if (!result.trim()) {
      if (run.signal === "SIGKILL" || run.status === "TO") {
        result = "❌ Error: Process timed out. Java requires more time to start.";
      } else if (run.code !== 0 && run.code !== null) {
        result = `❌ Error: Process exited with code ${run.code}`;
      } else {
        result = "✅ Program executed but returned no text.";
      }
    }

    res.json({ output: result });

  } catch (error) {
    const details = error.response?.data?.message || error.message;
    console.error("Execution Error:", details);
    res.status(500).json({ error: "Execution Failed", details });
  }
});

// --- 4. AI SUMMARY (GEMINI 2.5 PRO & PRECISE FORMATTING) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
// FIX: Switched to 2.5 Pro to avoid 404 on sunsetting 1.5 models
const PRIMARY_MODEL = "gemini-2.5-flash";

app.post("/api/summarize", async (req, res) => {
  const { roomId, transcript = "General coding session", code = "" } = req.body;
  
  const prompt = `Analyze this code session. Return a precise technical summary.
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
    let responseText = result.response.text();
    
    // FIX: Remove Markdown backticks if AI returns them
    const cleanJsonString = responseText.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJsonString);

    await SessionLog.findOneAndUpdate(
      { roomId },
      { 
        generatedSummary: data.summary, 
        generatedFlashcards: data.flashcards, 
        fullTranscript: transcript,
        approach: data.approach,
        logic: data.logic
      },
      { upsert: true }
    );

    res.json(data);
  } catch (error) {
    console.error("❌ AI Generation Failed:", error.message);
    res.status(500).json({ error: "AI Failed", details: error.message });
  }
});

// --- 5. SOCKET.IO ---
const io = new Server(server, { cors: { origin: "*" } });
const activeRooms = {}; 

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId);
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = { code: "// Welcome to PeerSync Lab", driver: socket.id };
    }
    socket.emit("initial_code", activeRooms[roomId].code);
    io.to(roomId).emit("token_passed", activeRooms[roomId].driver);
  });

  socket.on("code_update", ({ roomId, code }) => {
    if (activeRooms[roomId]?.driver === socket.id) {
      activeRooms[roomId].code = code;
      socket.to(roomId).emit("code_update", code);
    }
  });

  socket.on("request_driver", ({ roomId, requesterName }) => {
    const driverId = activeRooms[roomId]?.driver;
    if (driverId) {
      io.to(driverId).emit("driver_request_received", { requesterId: socket.id, requesterName });
    }
  });

  socket.on("accept_driver_request", ({ roomId, requesterId }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].driver = requesterId; 
      io.to(roomId).emit("token_passed", requesterId); 
    }
  });

  socket.on("share_output", ({ roomId, output }) => {
    socket.to(roomId).emit("receive_output", output);
  });

  socket.on("share_summary", ({ roomId, aiData }) => {
    socket.to(roomId).emit("receive_summary", aiData);
  });
});

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Backend live on port 5000`));