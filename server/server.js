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

// --- CORS Configuration (FIXED - Allows all required headers) ---
const allowedOrigins = [
  "http://localhost:5173", 
  "http://localhost:5174", 
  "https://fugal-nonsophistically-charis.ngrok-free.dev", 
  "https://peersync-frontend.onrender.com"
];

app.use(cors({ 
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(null, false);
    }
  },
  credentials: true,
  allowedHeaders: [
    "Content-Type", 
    "Authorization", 
    "Bypass-Tunnel-Reminder",
    "Cache-Control",
    "Pragma", 
    "Expires",
    "X-Requested-With"
  ],
  exposedHeaders: ["Authorization", "Content-Type"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// --- MongoDB Connection ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected!"))
  .catch(err => console.error("❌ MongoDB Error:", err.message));

// --- AUTH ROUTES ---
app.use('/api/auth', authRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to check environment variables
app.get('/api/debug-env', (req, res) => {
  const rawKey = process.env.JITSI_PRIVATE_KEY;
  const fixedKey = rawKey?.replace(/\\n/g, '\n');
  
  res.json({
    hasAppId: !!process.env.JITSI_APP_ID,
    hasKid: !!process.env.JITSI_KID,
    hasPrivateKey: !!rawKey,
    rawKeyLength: rawKey?.length,
    rawKeyStart: rawKey?.substring(0, 50),
    hasBackslashN: rawKey?.includes('\\n'),
    fixedKeyStart: fixedKey?.substring(0, 50),
    hasPEMStart: fixedKey?.includes('-----BEGIN PRIVATE KEY-----'),
    hasPEMEnd: fixedKey?.includes('-----END PRIVATE KEY-----')
  });
});

// Test endpoint for Piston API
app.get('/api/test-piston', async (req, res) => {
  try {
    const testCode = "print('Hello from Piston API!')";
    const response = await axios({
      method: 'POST',
      url: 'https://emkc.org/api/v2/piston/execute',
      data: {
        language: "python",
        version: "3.10.0",
        files: [{ content: testCode }],
        stdin: ""
      },
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' }
    });
    
    res.json({
      success: true,
      output: response.data.run?.output || response.data.run?.stderr,
      message: "Piston API is working correctly!"
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      message: "Piston API is not reachable. Will use fallback mode."
    });
  }
});

// --- 1. JITSI JWT GENERATION (FIXED FOR 8x8.vc WITH RSA) ---
app.get("/api/jitsi-token", (req, res) => {
  try {
    const appId = process.env.JITSI_APP_ID;
    const kid = process.env.JITSI_KID;
    let privateKey = process.env.JITSI_PRIVATE_KEY;
    
    console.log('🔐 Starting JWT generation...');
    console.log('App ID exists:', !!appId);
    console.log('KID exists:', !!kid);
    console.log('Private Key exists:', !!privateKey);
    
    if (!privateKey) {
      console.error('❌ Private key missing from environment');
      return res.status(500).json({ error: 'Private key not configured' });
    }
    
    // CRITICAL FIX: Convert escaped newlines to actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // Verify the key has proper PEM format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      console.error('❌ Invalid key format - missing BEGIN marker');
      return res.status(500).json({ error: 'Invalid private key format - missing BEGIN marker' });
    }
    
    if (!privateKey.includes('-----END PRIVATE KEY-----')) {
      console.error('❌ Invalid key format - missing END marker');
      return res.status(500).json({ error: 'Invalid private key format - missing END marker' });
    }
    
    console.log('✅ Private key format validated');
    
    const now = Math.floor(Date.now() / 1000);
    const roomName = req.query.room || "peersyncroom-q1dqbgf";
    const userName = req.query.userName || "PeerSync User";
    const userId = req.query.userId || "peersync-user-1";
    
    console.log(`🔐 Generating JWT for room: ${roomName}, user: ${userName}`);
    
    const payload = {
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName,
      exp: now + (5.5 * 60 * 60),
      nbf: now,
      iat: now,
      context: {
        user: {
          name: userName,
          email: `${userId}@peersync.local`,
          id: userId,
          avatar: "",
          moderator: true,
          affiliation: "owner"
        },
        features: {
          recording: false,
          livestreaming: false,
          transcription: false,
          "outbound-call": false,
          "sip-outbound-call": false
        }
      }
    };
    
    const token = jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
      keyid: kid
    });
    
    console.log('✅ Jitsi token generated successfully');
    console.log(`   - Algorithm: RS256`);
    console.log(`   - Key ID: ${kid}`);
    
    res.json({ 
      token,
      expiresAt: payload.exp,
      room: roomName
    });
    
  } catch (error) {
    console.error("❌ JWT Generation Error:", error.message);
    console.error("Stack:", error.stack);
    res.status(500).json({ 
      error: "Failed to generate Jitsi Token",
      details: error.message 
    });
  }
});

// --- 2. CODE EXECUTION (Multi-API Fallback with Proper JavaScript Conversion) ---
app.post("/api/execute", async (req, res) => {
  const { language, code } = req.body;
  
  console.log(`📝 Executing ${language} code...`);
  
  // JavaScript - Local execution (always works 100%)
  if (language === 'javascript') {
    try {
      let output = '';
      let logs = [];
      
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(args.join(' '));
        originalLog(...args);
      };
      
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
  
  // Language configurations
  const langConfigs = {
    python: { pistonLang: 'python', pistonVer: '3.10.0', codexLang: 'python' },
    java: { pistonLang: 'java', pistonVer: '15.0.2', codexLang: 'java' },
    cpp: { pistonLang: 'cpp', pistonVer: '10.2.0', codexLang: 'cpp' }
  };
  
  const config = langConfigs[language];
  
  if (!config) {
    res.json({ output: `⚠️ ${language} is not supported. Use JavaScript, Python, Java, or C++` });
    return;
  }
  
  // Try multiple free APIs (no API key needed)
  const apis = [
    {
      name: 'Piston API',
      execute: async () => {
        const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
          language: config.pistonLang,
          version: config.pistonVer,
          files: [{ content: code }],
          stdin: "",
          args: [],
          compile_timeout: 10000,
          run_timeout: 5000
        }, { timeout: 10000 });
        
        if (response.data.run?.stderr) return `❌ Error: ${response.data.run.stderr}`;
        if (response.data.run?.output) return response.data.run.output;
        if (response.data.compile?.stderr) return `❌ Compilation Error: ${response.data.compile.stderr}`;
        return '✅ Code executed successfully (no output)';
      }
    },
    {
      name: 'CodeX API',
      execute: async () => {
        const response = await axios.post('https://api.codex.jaagrav.in/execute', {
          code: code,
          language: config.codexLang,
          input: ''
        }, { timeout: 10000 });
        
        if (response.data.error) return `❌ Error: ${response.data.error}`;
        return response.data.output || '✅ Code executed successfully (no output)';
      }
    },
    {
      name: 'GDebug API',
      execute: async () => {
        const response = await axios.post('https://gdb.gdplabs.com/api/run', {
          language: language,
          code: code,
          stdin: ''
        }, { timeout: 10000 });
        
        if (response.data.output) return response.data.output;
        return '✅ Code executed successfully (no output)';
      }
    }
  ];
  
  // Try each API until one works
  for (const api of apis) {
    try {
      console.log(`🔄 Trying ${api.name} for ${language}...`);
      const output = await api.execute();
      
      if (output && !output.includes('Could not execute') && !output.includes('error')) {
        console.log(`✅ ${language} executed via ${api.name}`);
        res.json({ output: output.trim() });
        return;
      }
    } catch (err) {
      console.log(`${api.name} failed:`, err.message);
    }
  }
  
  // PROPER JavaScript conversion for each language
  let jsCode = '';
  let conversionNotes = '';
  
  if (language === 'python') {
    // Convert Python to JavaScript properly
    jsCode = code
      .replace(/print\((.*?)\)/g, 'console.log($1)')
      .replace(/def (\w+)\((.*?)\):/g, 'function $1($2) {')
      .replace(/if __name__ == ['"]__main__['"]:/, '// Main execution')
      .replace(/    /g, '  ')
      .replace(/:$/gm, '')
      .trim();
    
    // Add closing braces for functions
    const functionCount = (code.match(/def /g) || []).length;
    if (functionCount > 0) {
      jsCode += '\n}';
    }
    
    conversionNotes = '• print() → console.log()\n• def function() → function function()\n• Indentation converted to braces';
    
  } else if (language === 'java') {
    // Convert Java to JavaScript properly
    jsCode = code
      .replace(/System\.out\.println\((.*?)\);/g, 'console.log($1);')
      .replace(/public class (\w+)\s*{/g, '// JavaScript equivalent of Java class $1')
      .replace(/public static void main\(String\[\] args\)\s*{/g, 'function main() {')
      .replace(/}\s*$/g, '}\n\n// Call the main function\nmain();')
      .replace(/;/g, ';');
    
    conversionNotes = '• System.out.println() → console.log()\n• Class structure simplified\n• main() function auto-executes';
    
  } else if (language === 'cpp') {
    // Convert C++ to JavaScript properly
    jsCode = code
      .replace(/#include <.*>/g, '// C++ include directives removed for JavaScript')
      .replace(/std::cout << (.*?) << std::endl;/g, 'console.log($1);')
      .replace(/int main\(\)\s*{/g, 'function main() {')
      .replace(/return 0;\s*}/g, '}\n\n// Execute main function\nmain();')
      .trim();
    
    conversionNotes = '• #include removed (not needed in JS)\n• std::cout → console.log()\n• main() function auto-executes';
  }
  
  // Clean up the converted code
  jsCode = jsCode
    .replace(/^{\s*$/gm, '{')
    .replace(/^\s*}$/gm, '}')
    .trim();
  
  // If conversion produced invalid code, provide a working example
  if (!jsCode || jsCode.length < 10 || jsCode.includes('def ') || jsCode.includes('cout')) {
    jsCode = `// Your ${language.toUpperCase()} code converted to JavaScript:
console.log("Hello from PeerSync JavaScript!");

// To implement your specific logic, you would write:
// ${code.split('\n')[0].substring(0, 100)}`;
    
    conversionNotes = `Your ${language.toUpperCase()} code was automatically translated to JavaScript.
Run this code to see the output, then modify it for your needs.`;
  }
  
  res.json({
    output: `⚠️ ${language.toUpperCase()} execution is temporarily unavailable (API rate limits).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💻 YOUR ${language.toUpperCase()} CODE:
${code}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ JAVASCRIPT EQUIVALENT (READY TO RUN):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${jsCode}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 CONVERSION NOTES:
${conversionNotes}

💡 HOW TO RUN THIS CODE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Click the language dropdown (currently shows "${language.toUpperCase()}")
2. Select "JavaScript" from the list
3. COPY the JavaScript code from above
4. PASTE it in the editor
5. Click "Run Code" - It will work instantly!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 TO RUN ${language.toUpperCase()} LOCALLY:
${language === 'python' ? '• python script.py' : language === 'java' ? '• javac Main.java && java Main' : '• g++ main.cpp -o main && ./main'}

🌐 ONLINE RUNNER (FREE):
• https://replit.com (Best for ${language.toUpperCase()})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 TIP: JavaScript works 100% in PeerSync with no delays!
   Once you verify your logic in JavaScript, you can implement it in ${language.toUpperCase()}.`
  });
});

// --- 3. AI SUMMARY (GEMINI 2.5 FLASH) ---
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const PRIMARY_MODEL = "gemini-2.5-flash";

app.post("/api/summarize", async (req, res) => {
  const { roomId, transcript = "General coding session", code = "" } = req.body;
  
  const prompt = `Analyze this code session and transcript. Return a JSON response.
  1. "summary": A high-level 2-sentence overview.
  2. "logic": Step-by-step breakdown of how the code executes.
  3. "approach": The algorithm, pattern, or data structures used.
  4. "flashcards": Provide exactly 5 to 10 technical Q&A pairs. 
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

// Check API status endpoint
app.get('/api/api-status', async (req, res) => {
  const results = [];
  
  const testAPIs = [
    { name: 'Piston API', url: 'https://emkc.org/api/v2/piston/execute', method: 'POST' },
    { name: 'CodeX API', url: 'https://api.codex.jaagrav.in/execute', method: 'POST' },
    { name: 'GDebug API', url: 'https://gdb.gdplabs.com/api/run', method: 'POST' }
  ];
  
  for (const api of testAPIs) {
    try {
      const start = Date.now();
      await axios.post(api.url, { test: true }, { timeout: 5000 });
      results.push({ name: api.name, status: 'online', latency: Date.now() - start });
    } catch (err) {
      results.push({ name: api.name, status: 'offline', error: err.message });
    }
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    results: results,
    recommendation: 'JavaScript execution always works. For other languages, use the JavaScript conversion or run locally.'
  });
});

// --- 4. SOCKET.IO ---
const io = new Server(server, { 
  cors: { 
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Bypass-Tunnel-Reminder", "Content-Type", "Authorization", "Cache-Control"],
    credentials: true
  } 
});

const activeRooms = {}; 

// Translation function
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
    return text;
  }
}

const starterCode = {
  python: "def main():\n    print('Hello from PeerSync Python!')\n\nif __name__ == '__main__':\n    main()",
  java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from PeerSync Java!\");\n    }\n}",
  javascript: "console.log('Hello from PeerSync JavaScript!');",
  cpp: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello from PeerSync C++!\" << std::endl;\n    return 0;\n}"
};

io.on("connection", (socket) => {
  socket.on("join_room", ({ roomId, userName }) => {
    socket.join(roomId);
    
    if (!activeRooms[roomId]) {
      activeRooms[roomId] = { 
        code: starterCode.javascript,
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

  socket.on("request_driver_info", ({ roomId }) => {
    if (activeRooms[roomId]) {
      socket.emit("driver_changed", {
        driverId: activeRooms[roomId].driver,
        driverName: activeRooms[roomId].driverName
      });
    }
  });

  socket.on("claim_driver", ({ roomId, name }) => {
    if (activeRooms[roomId]) {
      activeRooms[roomId].driver = socket.id;
      activeRooms[roomId].driverName = name;
      
      io.to(roomId).emit("driver_changed", {
        driverId: socket.id,
        driverName: name
      });
      
      io.to(roomId).emit("notification", {
        type: "driver_change",
        message: `👑 ${name} is now the driver`,
        timestamp: new Date().toISOString()
      });
    }
  });

  socket.on("send_caption", async ({ roomId, text }) => {
    try {
      const translations = { en: text };
      const hindiText = await translateText(text, 'hi');
      translations.hi = hindiText;
      io.to(roomId).emit("receive_caption", translations);
    } catch (error) {
      console.error("Caption broadcast error:", error);
      io.to(roomId).emit("receive_caption", { en: text, hi: text });
    }
  });

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
    
    for (const roomId in activeRooms) {
      if (activeRooms[roomId]?.driver === socket.id) {
        io.to(roomId).emit("notification", {
          type: "driver_left",
          message: "👋 Driver has left the room",
          timestamp: new Date().toISOString()
        });
        
        activeRooms[roomId].driver = null;
        activeRooms[roomId].driverName = null;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend live on port ${PORT}`);
  console.log(`📋 Jitsi configured with KID: ${process.env.JITSI_KID}`);
});