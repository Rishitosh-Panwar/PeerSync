import React, { useState } from 'react';
import axios from 'axios';

const Editor = ({ code, setCode, roomId, socket, isDriver }) => {
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState("javascript");
    const [suggestions, setSuggestions] = useState([]);

    const languages = [
        { name: "JavaScript", value: "javascript" },
        { name: "Python", value: "python" },
        { name: "Java", value: "java" },
        { name: "C++", value: "cpp" }
    ];

    const keywords = ["function", "const", "let", "console.log", "import", "return", "if", "else", "def", "print", "class"];
    
    const handleCodeChange = (e) => {
        const val = e.target.value;
        if (isDriver) {
            setCode(val);
            socket.emit("code_update", { roomId, code: val });
            
            const words = val.split(/\s+/);
            const lastWord = words[words.length - 1];
            if (lastWord.length > 1) {
                setSuggestions(keywords.filter(k => k.startsWith(lastWord)).slice(0, 3));
            } else {
                setSuggestions([]);
            }
        }
    };

    const runCode = async () => {
        setLoading(true);
        setOutput("🚀 Running...");
        try {
            const res = await axios.post("http://localhost:5000/api/execute", {
                language: language, 
                code: code
            });
            setOutput(res.data.run.output || "✅ Success (No output).");
        } catch (err) {
            setOutput("❌ Error: Check backend connection on port 5000.");
        }
        setLoading(false);
    };

    return (
        <div className="peer-sync-editor">
            <div className="toolbar">
                <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-select">
                    {languages.map(lang => <option key={lang.value} value={lang.value}>{lang.name}</option>)}
                </select>
                <button onClick={runCode} disabled={loading || !isDriver} className="run-btn">
                    {loading ? "..." : "▶ Run"}
                </button>
                {!isDriver && <span className="view-only">Navigator Mode</span>}
            </div>

            <div className="editor-area">
                <textarea 
                    value={code} 
                    onChange={handleCodeChange} 
                    className="code-textarea"
                    placeholder="// Collaborative workspace..."
                    readOnly={!isDriver}
                />
                {suggestions.length > 0 && (
                    <div className="suggestion-box">
                        {suggestions.map(s => <div key={s} className="hint" onClick={() => {
                            const newCode = code + s.replace(suggestions[0], ''); // Simple append logic
                            setCode(newCode);
                            setSuggestions([]);
                        }}>{s}</div>)}
                    </div>
                )}
            </div>

            <div className="terminal">
                <div className="term-label">OUTPUT</div>
                <pre>{output || "> Console is ready."}</pre>
            </div>

            <style>{`
                .peer-sync-editor { display: flex; flex-direction: column; background: #1e1e1e; border-radius: 8px; border: 1px solid #444; }
                .toolbar { background: #2d2d2d; padding: 8px; display: flex; gap: 10px; border-bottom: 1px solid #444; }
                .lang-select { background: #444; color: white; border: 1px solid #555; border-radius: 4px; }
                .run-btn { background: #28a745; color: white; border: none; padding: 4px 12px; border-radius: 4px; cursor: pointer; }
                .code-textarea { width: 100%; height: 300px; background: #1e1e1e; color: #abb2bf; padding: 15px; font-family: 'Fira Code', monospace; border: none; outline: none; resize: none; }
                .suggestion-box { position: absolute; background: #333; color: #00ff00; border: 1px solid #555; padding: 5px; margin-top: -80px; margin-left: 20px; z-index: 10; }
                .hint { padding: 2px 8px; cursor: pointer; border-bottom: 1px solid #444; font-size: 12px; }
                .terminal { background: #000; color: #0f0; padding: 10px; height: 120px; border-top: 1px solid #444; overflow-y: auto; }
                .term-label { font-size: 10px; color: #666; font-weight: bold; }
                .view-only { color: #ffc107; font-size: 12px; margin-left: auto; align-self: center; }
            `}</style>
        </div>
    );
};

export default Editor;