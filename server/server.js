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

// --- 1. JITSI JWT GENERATION (FIXED) ---
app.get("/api/jitsi-token", (req, res) => {
  try {
    // For testing on Render, use HS256 instead of RS256
    const appId = "vpaas-magic-cookie-8f291ebf52794eb5896baaed63b01738";
    const now = Math.floor(Date.now() / 1000);
    
    // Use HS256 algorithm (simpler, doesn't require private key)
    const token = jwt.sign(
      {
        aud: 'jitsi',
        iss: 'chat',
        sub: appId,
        room: '*',
        exp: now + (5 * 60 * 60), // 5 hours
        nbf: now,
        iat: now,
        context: {
          user: {
            name: "PeerSync User",
            email: "user@peersync.local",
            id: "peersync-user-1",
            affiliation: "owner",
            moderator: true
          },
          features: {
            recording: false,
            livestreaming: false,
            transcription: false,
            'outbound-call': false
          }
        }
      },
      'your-secret-key-change-this-in-production', // Simple secret key
      { algorithm: 'HS256' }
    );
    
    console.log('✅ Jitsi token generated successfully');
    res.json({ token });
  } catch (error) {
    console.error("❌ JWT Generation Error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to generate Jitsi Token",
      details: error.message 
    });
  }
});

// --- 2. CODE EXECUTION (FIXED - Works without Piston) ---
app.post("/api/execute", async (req, res) => {
  const { language, code } = req.body;
  
  console.log(`📝 Executing ${language} code...`);
  
  // For JavaScript - Execute locally (works immediately)
  if (language === 'javascript') {
    try {
      let output = '';
      let logs = [];
      
      // Capture console.log
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };
      
      // Execute code safely
      try {
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        const func = new AsyncFunction(code);
        await func();
        output = logs.join('\n');
        if (!output.trim()) {
          output = '✅ JavaScript code executed successfully (no console output)';
        }
      } catch (error) {
        output = `❌ JavaScript Error: ${error.message}`;
      } finally {
        console.log = originalLog;
      }
      
      res.json({ output });
      return;
    } catch (error) {
      console.error('JS execution error:', error);
      res.status(500).json({ error: error.message });
      return;
    }
  }
  
  // For Python, Java, C++ - Provide helpful message + local execution option
  let output = '';
  
  if (language === 'python') {
    // Try to execute Python if python3 is installed on server
    try {
      const { exec } = require('child_process');
      const fs = require('fs');
      const tempFile = '/tmp/script_' + Date.now() + '.py';
      
      fs.writeFileSync(tempFile, code);
      
      const result = await new Promise((resolve) => {
        exec(`python3 ${tempFile}`, { timeout: 5000 }, (error, stdout, stderr) => {
          fs.unlinkSync(tempFile);
          resolve({ stdout, stderr, error });
        });
      });
      
      output = result.stdout || result.stderr;
      if (!output.trim()) output = '✅ Python code executed successfully';
      
    } catch (err) {
      output = `⚠️ Python execution requires Python installed on server.\n\nYour code:\n${code}\n\n💡 For now, use JavaScript for instant execution.`;
    }
  } 
  else if (language === 'java') {
    output = `⚠️ Java execution note:\n\nYour code:\n${code}\n\n💡 To run Java:\n1. Save as Main.java\n2. Run: javac Main.java && java Main\n\n💡 Or use JavaScript for instant execution in the browser.`;
  }
  else if (language === 'cpp') {
    output = `⚠️ C++ execution note:\n\nYour code:\n${code}\n\n💡 To run C++:\n1. Save as main.cpp\n2. Compile: g++ main.cpp -o main\n3. Run: ./main\n\n💡 Or use JavaScript for instant execution in the browser.`;
  }
  else {
    output = `⚠️ ${language} execution requires local setup.\n\n💡 JavaScript execution works immediately!`;
  }
  
  res.json({ output });
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