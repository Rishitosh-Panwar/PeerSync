import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const Editor = ({ code, setCode, roomId, socket, isDriver }) => {
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState("javascript");
    const [suggestions, setSuggestions] = useState([]);
    
    // --- Layout State ---
    const [consoleHeight, setConsoleHeight] = useState(150);
    const [editorWidth, setEditorWidth] = useState(70); // Percentage of the screen

    const languages = [
    { name: "Java", value: "java" },
    { name: "Python", value: "python" },
    { name: "JavaScript", value: "javascript" },
    { name: "C++", value: "cpp" } 
];

    const keywords = ["function", "const", "let", "console.log", "import", "return", "if", "else", "def", "print", "class"];

    // Listen for layout sync from others
    useEffect(() => {
        socket.on("receive_console_height", (height) => setConsoleHeight(height));
        return () => socket.off("receive_console_height");
    }, [socket]);

    // --- Resizing Logic ---
    const startVerticalResize = (mouseDownEvent) => {
        const startY = mouseDownEvent.clientY;
        const startHeight = consoleHeight;

        const onMouseMove = (mouseMoveEvent) => {
            const delta = startY - mouseMoveEvent.clientY;
            const newHeight = Math.min(Math.max(startHeight + delta, 50), 500);
            setConsoleHeight(newHeight);
            socket.emit("update_console_height", { roomId, height: newHeight });
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const startHorizontalResize = (mouseDownEvent) => {
        const onMouseMove = (mouseMoveEvent) => {
            const newWidth = (mouseMoveEvent.clientX / window.innerWidth) * 100;
            if (newWidth > 20 && newWidth < 90) {
                setEditorWidth(newWidth);
            }
        };

        const onMouseUp = () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
    };

    const handleCodeChange = (e) => {
        const val = e.target.value;
        if (isDriver) {
            setCode(val);
            socket.emit("code_update", { roomId, code: val });
            const words = val.split(/\s+/);
            const lastWord = words[words.length - 1];
            setSuggestions(lastWord.length > 1 ? keywords.filter(k => k.startsWith(lastWord)).slice(0, 3) : []);
        }
    };

    const runCode = async () => {
        setLoading(true);
        setOutput("🚀 Running...");
        try {
            const res = await axios.post("http://localhost:5000/api/execute", { language, code });
            setOutput(res.data.run.output || "✅ Success (No output).");
        } catch (err) {
            setOutput("❌ Error: Engine Offline.");
        }
        setLoading(false);
    };

    return (
        <div className="workspace-container" style={{ gridTemplateColumns: `${editorWidth}% 5px 1fr` }}>
            {/* 1. EDITOR SECTION */}
            <div className="peer-sync-editor">
                <div className="toolbar">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-select">
                        {languages.map(lang => <option key={lang.value} value={lang.value}>{lang.name}</option>)}
                    </select>
                    <button onClick={runCode} disabled={loading || !isDriver} className="run-btn">
                        {loading ? "..." : "▶ Run"}
                    </button>
                    {!isDriver && <span className="view-only">Navigator Mode (Syncing...)</span>}
                </div>

                <div className="editor-area">
                    <textarea value={code} onChange={handleCodeChange} className="code-textarea" readOnly={!isDriver} />
                </div>

                {/* Vertical Resizer (Dragger Handle) */}
                <div className="v-resizer" onMouseDown={startVerticalResize} title="Drag to resize console" />

                <div className="terminal" style={{ height: `${consoleHeight}px` }}>
                    <div className="term-label">OUTPUT</div>
                    <pre>{output || "> Console is ready."}</pre>
                </div>
            </div>

            {/* 2. Horizontal Resizer (Dragger between Editor and Video/Right Sidebar) */}
            <div className="h-resizer" onMouseDown={startHorizontalResize} />

            {/* 3. SIDEBAR (Video Call / Tools) Area */}
            <div className="sidebar-area">
               <div className="sidebar-placeholder">Video Call / AI Area</div>
            </div>

            <style>{`
                .workspace-container { display: grid; height: 100vh; width: 100vw; background: #000; overflow: hidden; }
                .peer-sync-editor { display: flex; flex-direction: column; background: #1e1e1e; height: 100%; position: relative; }
                
                /* Draggers */
                .v-resizer { height: 6px; background: #333; cursor: ns-resize; transition: background 0.2s; border-top: 1px solid #444; }
                .v-resizer:hover { background: #28a745; }
                .h-resizer { width: 5px; background: #333; cursor: ew-resize; transition: background 0.2s; }
                .h-resizer:hover { background: #28a745; }

                .toolbar { background: #2d2d2d; padding: 10px; display: flex; gap: 10px; border-bottom: 1px solid #444; }
                .lang-select { background: #444; color: white; border: 1px solid #555; padding: 5px; border-radius: 4px; }
                .run-btn { background: #28a745; color: white; border: none; padding: 6px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; }
                
                .editor-area { flex: 1; display: flex; overflow: hidden; }
                .code-textarea { width: 100%; height: 100%; background: #1e1e1e; color: #abb2bf; padding: 20px; font-family: 'Fira Code', monospace; border: none; outline: none; resize: none; font-size: 14px; line-height: 1.5; }
                
                .terminal { background: #000; color: #0f0; padding: 15px; border-top: 1px solid #444; overflow-y: auto; font-family: monospace; }
                .term-label { font-size: 11px; color: #888; margin-bottom: 8px; letter-spacing: 1px; }
                .sidebar-area { background: #121212; display: flex; justify-content: center; align-items: center; border-left: 1px solid #333; }
                .sidebar-placeholder { color: #555; font-weight: bold; }
                .view-only { color: #ffc107; font-size: 12px; margin-left: auto; align-self: center; }
            `}</style>
        </div>
    );
};

export default Editor;