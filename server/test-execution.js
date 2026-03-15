const axios = require('axios');

const testCode = async () => {
    console.log("🚀 Testing Local Piston Execution...");
    try {
        const response = await axios.post("http://localhost:5000/api/execute", {
            language: "javascript", // This will be mapped to 'node' in your server.js
            code: "console.log('Hello World');"
        });

        console.log("✅ Full Backend Response:", JSON.stringify(response.data, null, 2));
        
        if (response.data.run && response.data.run.output) {
            console.log("\n✨ SUCCESS! Output:", response.data.run.output);
        } else {
            console.log("\n⚠️ Response received, but output is empty. Check your runtimeMap versions.");
        }
    } catch (error) {
        console.error("❌ Test Failed:", error.message);
    }
};

testCode();