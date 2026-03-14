const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.processSessionAI = async (req, res) => {
    try {
        const { transcript, code } = req.body;

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "Missing GEMINI_API_KEY in .env" });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest",
            generationConfig: { responseMimeType: "application/json" }
        });

        const prompt = `
            Analyze this session.
            Transcript of conversation: ${transcript || "No speech recorded."}
            Code written: ${code || "No code written."}

            Return JSON with:
            1. "summary": A concise overview.
            2. "flashcards": Array of 3 objects with "question" and "answer".
        `;

        const result = await model.generateContent(prompt);
        res.status(200).json(JSON.parse(result.response.text()));
    } catch (error) {
        console.error("AI Error:", error.message);
        res.status(500).json({ error: "AI failed", message: error.message });
    }
};