const { HfInference } = require("@huggingface/inference");

exports.processSessionAI = async (req, res) => {
    try {
        const { transcript } = req.body;

        // Verify token exists before calling API
        if (!process.env.HF_TOKEN) {
            console.error("❌ CRITICAL: HF_TOKEN is missing from .env");
            return res.status(500).json({ error: "Server configuration error: missing API key" });
        }

        const hf = new HfInference(process.env.HF_TOKEN);

        // 1. Generate Summary
        const summaryResponse = await hf.summarization({
            model: 'facebook/bart-large-cnn',
            inputs: transcript,
            parameters: { max_length: 150 }
        });

        // 2. Generate Flashcards
        const flashcardPrompt = `Transcript: ${transcript} \n\n Create 3 short study flashcards in Q&A format.`;
        const flashcardsResponse = await hf.textGeneration({
            model: 'mistralai/Mistral-7B-Instruct-v0.2',
            inputs: flashcardPrompt,
            parameters: { max_new_tokens: 200 }
        });

        res.status(200).json({
            summary: summaryResponse.summary_text,
            flashcards: flashcardsResponse.generated_text
        });
    } catch (error) {
        // Detailed logging to help you see the exact Hugging Face error in Docker
        console.error("AI Error Detail:", error.message);
        res.status(500).json({ 
            error: "AI failed to process session",
            message: error.message // Sending message back to Postman for easier debugging
        });
    }
};