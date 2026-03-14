require("dotenv").config();
const axios = require("axios");

async function inspect() {
    try {
        const response = await axios.get("https://tanushree08-my-piston-engine.hf.space/api/v2/runtimes", {
            headers: { 'Authorization': `Bearer ${process.env.HF_TOKEN}` }
        });

        console.log("📊 INSTALLED RUNTIMES ON YOUR ENGINE:");
        console.table(response.data.map(r => ({
            Language: r.language,
            Version: r.version,
            Aliases: r.aliases.join(", ")
        })));
        
        console.log("\n💡 SOLUTION: You MUST use the exact 'Language' and 'Version' shown in the table above in your requests.");
    } catch (err) {
        console.error("❌ Failed to reach engine:", err.response?.data || err.message);
    }
}
inspect();