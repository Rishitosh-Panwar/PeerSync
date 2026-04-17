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
const { User, Room, SessionLog } = require("./models/index"); 

const app = express();
const server = http.createServer(app);

// Import auth routes
const authRoutes = require('./routes/auth');

app.use(express.json());

// FIXED CORS: Added strict matching for Vite ports
app.use(cors({ 
 origin: ["http://localhost:5173", "http://localhost:5174", "https://fugal-nonsophistically-charis.ngrok-free.dev", "https://peersync-frontend.onrender.com"], 
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "Bypass-Tunnel-Reminder"]
}));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

// --- AUTH ROUTES ---
app.use('/api/auth', authRoutes);

// Add this near the top of your server.js, after app.use() statements
app.get('/api/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

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

// --- 2. CODE EXECUTION (DYNAMIC FIX) ---
app.post("/api/execute", async (req, res) => {
  const { language, code } = req.body;
  const PISTON_BASE = "http://piston:2000/api/v2";

  // Map languages to their expected entry-point filenames
  const fileMapping = {
    java: "Main.java",
    python: "script.py",
    javascript: "index.js",
    cpp: "main.cpp",
  };

  const filename = fileMapping[language.toLowerCase()] || "script";

  try {
    // 1. Get the list of available runtimes from Piston
    const runtimesResponse = await axios.get(`${PISTON_BASE}/runtimes`);
    const selected = runtimesResponse.data.find(r => 
      r.language === language.toLowerCase() || (r.aliases && r.aliases.includes(language.toLowerCase()))
    );

    if (!selected) {
      return res.status(400).json({ error: `Language '${language}' not supported by execution engine.` });
    }

    // 2. Prepare the execution payload dynamically
    const payload = {
      language: selected.language,
      version: selected.version,
      files: [{ name: filename, content: code }]
    };

    // 3. Special handling for Java (Optional: keeps your previous optimization)
    if (selected.language === 'java') {
      payload.run_command = "java -XX:TieredStopAtLevel=1 -Xmx256m Main.java";
    }

    // 4. Send to Piston
    const response = await axios.post(`${PISTON_BASE}/execute`, payload);

    const run = response.data.run;
    console.log("PISTON DEBUG:", run); 

    let result = (run.stdout || "") + (run.stderr || "");

    if (!result.trim()) {
      if (run.signal === "SIGKILL" || run.status === "TO") {
        result = "❌ Error: Process timed out.";
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

// --- 3. AI SUMMARY (GEMINI 2.5 FLASH) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_MODEL = "gemini-2.5-flash"; // Ensuring the model is correct

app.post("/api/summarize", async (req, res) => {
  const { roomId, transcript = "General coding session", code = "" } = req.body;
  
  const prompt = `Analyze this code session and transcript. Return a JSON response.
  1. "summary": A high-level 2-sentence overview.
  2. "logic": Step-by-step breakdown of how the code executes.
  3. "approach": The algorithm, pattern, or data structures used.
  4. "flashcards": Provide exactly 5 to 10 technical Q&A pairs. 
     - Focus on: The specific language syntax used, the logic of the code, and general computer science concepts related to this snippet.
     - Format: An array of objects with { "q": "Question", "a": "Answer" }.

  Code: ${code}
  Transcript: ${transcript}

  Return ONLY a raw JSON object. Do not include markdown formatting.`;

  try {
    const model = genAI.getGenerativeModel({ 
        model: PRIMARY_MODEL, 
        generationConfig: { responseMimeType: "application/json" } 
    });

    const result = await model.generateContent(prompt);
    let responseText = result.response.text();
    
    const cleanJsonString = responseText.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanJsonString);

    // Save to DB (Ensure your SessionLog model supports 'generatedFlashcards')
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

// --- 4. SOCKET.IO ---
const io = new Server(server, { 
  cors: { 
    origin: "*", // Allows both localhost and the ngrok tunnel during development
    methods: ["GET", "POST"],
    allowedHeaders: ["Bypass-Tunnel-Reminder"],
    credentials: true
  } 
});
const activeRooms = {}; 

// Translation function with language detection
async function translateText(text, targetLang) {
  if (targetLang === 'en' || !targetLang) return text;
  
  try {
    const translateRes = await axios.post("https://libretranslate.de/translate", {
      q: text,
      source: "en",
      target: targetLang === 'hi' ? 'hi' : 'en',
      format: "text"
    });
    return translateRes.data.translatedText;
  } catch (error) {
    console.error("Translation error:", error.message);
    return text; // Fallback to original text
  }
}

io.on("connection", (socket) => {
    // 1. JOIN ROOM & INITIAL SYNC
    socket.on("join_room", ({ roomId, userName }) => {
        socket.join(roomId);
        
        if (!activeRooms[roomId]) {
            activeRooms[roomId] = { 
                code: starterCode.javascript || "// Welcome to PeerSync Lab", 
                driver: socket.id, 
                driverName: userName || "Anonymous" 
            };
        }
        
        socket.emit("initial_code", activeRooms[roomId].code);
        
        io.to(roomId).emit("driver_changed", {
            driverId: activeRooms[roomId].driver,
            driverName: activeRooms[roomId].driverName
        });
    });

    // Request driver info
    socket.on("request_driver_info", ({ roomId }) => {
        if (activeRooms[roomId]) {
            socket.emit("driver_changed", {
                driverId: activeRooms[roomId].driver,
                driverName: activeRooms[roomId].driverName
            });
        }
    });

    // 2. CLAIM DRIVER
    socket.on("claim_driver", ({ roomId, name }) => {
        if (activeRooms[roomId]) {
            activeRooms[roomId].driver = socket.id;
            activeRooms[roomId].driverName = name;

            io.to(roomId).emit("driver_changed", {
                driverId: socket.id,
                driverName: name
            });
            
            // Notify all users who is now driver
            io.to(roomId).emit("notification", {
                type: "driver_change",
                message: `👑 ${name} is now the driver`,
                timestamp: new Date().toISOString()
            });
        }
    });

    // 3. CAPTION BROADCASTING WITH DYNAMIC TRANSLATION
    socket.on("send_caption", async ({ roomId, text }) => {
        try {
            // Get all sockets in the room to determine their language preferences
            const sockets = await io.in(roomId).fetchSockets();
            const userLanguages = {};
            
            // We need to track user language preferences - you may want to store this in activeRooms
            // For now, we'll broadcast both English and Hindi and let frontend choose
            
            const translations = {
                en: text
            };
            
            // Translate to Hindi for Hindi-preferring users
            const hindiText = await translateText(text, 'hi');
            translations.hi = hindiText;
            
            // Broadcast both versions
            io.to(roomId).emit("receive_caption", translations);
            
        } catch (error) {
            console.error("Caption broadcast error:", error);
            io.to(roomId).emit("receive_caption", { en: text, hi: text });
        }
    });

    // 4. CODE & DATA SYNC
    socket.on("code_update", ({ roomId, code }) => {
        if (activeRooms[roomId]?.driver === socket.id) {
            activeRooms[roomId].code = code;
            socket.to(roomId).emit("code_update", code);
        }
    });

    socket.on("share_output", ({ roomId, output }) => {
        socket.to(roomId).emit("receive_output", output);
    });

    socket.on("language_change", ({ roomId, language }) => {
        socket.to(roomId).emit("receive_language", language);
    });

    socket.on("share_summary", ({ roomId, aiData }) => {
        io.to(roomId).emit("receive_summary", aiData);
    });

    socket.on("disconnect", () => {
        console.log(`User Disconnected: ${socket.id}`);
        
        // Check if the disconnected user was a driver
        for (const roomId in activeRooms) {
            if (activeRooms[roomId]?.driver === socket.id) {
                // Driver left, notify others
                io.to(roomId).emit("notification", {
                    type: "driver_left",
                    message: "👋 Driver has left the room",
                    timestamp: new Date().toISOString()
                });
                
                // Reset driver to null (next person can claim)
                activeRooms[roomId].driver = null;
                activeRooms[roomId].driverName = null;
            }
        }
    });
});

// Helper function for starter code (you may want to define this at the top)
const starterCode = {
    python: "def main():\n    print('Hello from PeerSync Python!')\n\nif __name__ == '__main__':\n    main()",
    java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from PeerSync Java!\");\n    }\n}",
    javascript: "console.log('Hello from PeerSync JavaScript!');",
    cpp: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello from PeerSync C++!\" << std::endl;\n    return 0;\n}"
};

const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`🚀 Backend live on port 5000`));