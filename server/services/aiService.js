const { HfInference } = require("@huggingface/inference");
const hf = new HfInference(process.env.HF_TOKEN);

const generateAIContent = async (transcript) => {
    // 1. Summarization
    const summary = await hf.summarization({
        model: 'facebook/bart-large-cnn',
        inputs: transcript,
    });

    // 2. Flashcards (Using Mistral-7B via Text Generation)
    const flashcardPrompt = `Create 3 flashcards from this text: "${transcript}". Format as Question: Answer:`;
    const flashcards = await hf.textGeneration({
        model: 'mistralai/Mistral-7B-Instruct-v0.2',
        inputs: flashcardPrompt,
    });

    return { 
        summary: summary.summary_text, 
        flashcards: flashcards.generated_text 
    };
};