require("dotenv").config();
const axios = require("axios");

// Use your Hugging Face Space URL
const url = "https://tanushree08-my-piston-engine.hf.space/api/execute";

async function solve() {
    try {
        console.log("🚀 Testing Custom Executor...");
        
        const payload = {
            language: "python", // or "java"
            code: "print('✅ PEERSYNC CUSTOM EXECUTOR IS LIVE!')"
        };

        const res = await axios.post(url, payload);

        if (res.data.run) {
            console.log("--------------------------");
            console.log("STDOUT:", res.data.run.stdout);
            console.log("STDERR:", res.data.run.stderr);
            console.log("RESULT:", res.data.run.output.trim());
            console.log("--------------------------");
            console.log("🏆 LOOP BROKEN! You are officially out of the 500/400 trap.");
        }
    } catch (err) {
        console.error("❌ Execution Failed:");
        if (err.response) {
            console.error(`Status: ${err.response.status}`);
            console.error(`Error Data:`, err.response.data);
        } else {
            console.error(`Message: ${err.message}`);
        }
    }
}

solve();