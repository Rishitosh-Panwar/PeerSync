require("dotenv").config();
const axios = require("axios");

const runtimes = [
    { language: "python", version: "3.10.0" },
    { language: "node", version: "18.15.0" },
    { language: "java", version: "15.0.2" },
    { language: "gcc", version: "10.2.0" } // Added C++ (GCC)
];

async function restore() {
    const token = process.env.HF_TOKEN;
    const baseUrl = "https://tanushree08-my-piston-engine.hf.space/api/v2/packages";

    for (const pkg of runtimes) {
        try {
            console.log(`⏳ Installing ${pkg.language} (${pkg.version})...`);
            await axios.post(baseUrl, pkg, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log(`✅ ${pkg.language} installed!`);
        } catch (err) {
            console.error(`❌ Failed to install ${pkg.language}:`, err.response?.data || err.message);
        }
    }
    console.log("\n🚀 C++ and others are ready! Verify with inspect_engine.js.");
}

restore();