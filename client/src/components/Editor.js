import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const Editor = ({ code, setCode, roomId, socket, isDriver, setIsDriver }) => {
    const [output, setOutput] = useState("");
    const [loading, setLoading] = useState(false);
    const [language, setLanguage] = useState("javascript");
    const [userName, setUserName] = useState("");
    const [currentDriverName, setCurrentDriverName] = useState("Loading...");
    
    // --- Caption State ---
    const [captions, setCaptions] = useState("");
    const [captionLang, setCaptionLang] = useState("en"); // 'en' or 'hi'
    const recognitionRef = useRef(null);

    // --- FIX: Use a Ref to keep track of language preference inside the socket listener ---
    const langRef = useRef("en");
    useEffect(() => {
        langRef.current = captionLang;
    }, [captionLang]);

    // --- Layout State ---
    const [consoleHeight, setConsoleHeight] = useState(150);
    const [editorWidth, setEditorWidth] = useState(70);

    const languages = [
        { name: "Java", value: "java" },
        { name: "Python", value: "python" },
        { name: "JavaScript", value: "javascript" },
        { name: "C++", value: "cpp" }
    ];

    useEffect(() => {
        // 1. Ask for Name
        const name = prompt("Enter your name to join the session:") || "Anonymous";
        setUserName(name);

        // 2. Socket Listeners
        socket.on("receive_console_height", (height) => setConsoleHeight(height));
        
        socket.on("driver_changed", ({ driverId, driverName }) => {
            setCurrentDriverName(driverName);
            // CRITICAL FIX: Update the driver state based on the ID sent from server
            setIsDriver(socket.id === driverId);
        });

        socket.on("receive_caption", (data) => {
            // FIX: Use langRef instead of captionLang to avoid stale state in the listener
            const textToShow = langRef.current === 'hi' ? data.hi : data.en;
            setCaptions(textToShow);
            
            // Auto-clear caption after 4 seconds
            setTimeout(() => setCaptions(""), 4000);
        });

        // Request initial driver info and join room
        socket.emit("join_room", { roomId, userName: name });
        socket.emit("request_driver_info", { roomId, name });

        return () => {
            socket.off("receive_console_height");
            socket.off("driver_changed");
            socket.off("receive_caption");
        };
    }, [socket, roomId, setIsDriver]); // captionLang removed from here to prevent listener resets

    // --- Speech Recognition Logic ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                
                // Emitting the text to the server for translation broadcast
                socket.emit("send_caption", { roomId, text: transcript });
            };
            recognitionRef.current.start();
        }
    }, [socket, roomId]);

    const requestDriverRole = () => {
        socket.emit("claim_driver", { roomId, name: userName });
    };

    const handleCodeChange = (e) => {
        const val = e.target.value;
        if (isDriver) {
            setCode(val);
            socket.emit("code_update", { roomId, code: val });
        }
    };

    const runCode = async () => {
        setLoading(true);
        setOutput("🚀 Running...");
        try {
            const res = await axios.post("https://peersync-backend.onrender.com/api/execute", { language, code });
            setOutput(res.data.run.output || "✅ Success (No output).");
        } catch (err) {
            setOutput("❌ Error: Engine Offline.");
        }
        setLoading(false);
    };

    return (
        <div className="workspace-container" style={{ gridTemplateColumns: `${editorWidth}% 5px 1fr` }}>
            <div className="peer-sync-editor">
                <div className="toolbar">
                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className="lang-select">
                        {languages.map(lang => <option key={lang.value} value={lang.value}>{lang.name}</option>)}
                    </select>
                    
                    <button onClick={runCode} disabled={loading || !isDriver} className="run-btn">
                        {loading ? "..." : "▶ Run"}
                    </button>

                    <div className="driver-info">
                        Driver: <span className="driver-name">{currentDriverName}</span>
                        {!isDriver && (
                            <button onClick={requestDriverRole} className="claim-btn">
                                Request Control
                            </button>
                        )}
                    </div>

                    <div className="caption-controls">
                        <select 
                            value={captionLang} 
                            onChange={(e) => setCaptionLang(e.target.value)}
                            style={{ background: '#444', color: 'white', borderRadius: '4px', padding: '4px' }}
                        >
                            <option value="en">English Subtitles</option>
                            <option value="hi">हिंदी सबटाइटल्स</option>
                        </select>
                    </div>
                </div>

                <div className="editor-area">
                    <textarea 
                        value={code} 
                        onChange={handleCodeChange} 
                        className="code-textarea" 
                        readOnly={!isDriver} 
                        placeholder={isDriver ? "Write code here..." : "Waiting for Driver control..."}
                    />
                    
                    {/* Caption Overlay */}
                    <div className="caption-overlay">
                        {captions && <p>{captions}</p>}
                    </div>
                </div>

                <div className="v-resizer" onMouseDown={(e) => {/* resizing logic inherited from parent CSS/props */}} />

                <div className="terminal" style={{ height: `${consoleHeight}px` }}>
                    <div className="term-label">OUTPUT</div>
                    <pre>{output || "> Console is ready."}</pre>
                </div>
            </div>

            <div className="h-resizer" onMouseDown={(e) => {/* resizing logic inherited from parent CSS/props */}} />

            <div className="sidebar-area">
               <div className="sidebar-placeholder">Video Call / AI Area</div>
            </div>

            <style>{`
                .workspace-container { display: grid; height: 100vh; width: 100vw; background: #000; overflow: hidden; }
                .peer-sync-editor { display: flex; flex-direction: column; background: #1e1e1e; height: 100%; position: relative; }
                .toolbar { background: #2d2d2d; padding: 10px; display: flex; gap: 15px; border-bottom: 1px solid #444; align-items: center; }
                .driver-info { color: #fff; font-size: 13px; display: flex; align-items: center; gap: 10px; }
                .driver-name { color: #28a745; font-weight: bold; }
                .claim-btn { background: #f39c12; color: white; border: none; padding: 4px 12px; cursor: pointer; border-radius: 4px; font-size: 11px; font-weight: bold; }
                .caption-overlay { position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #fff; padding: 12px 24px; border-radius: 8px; z-index: 100; pointer-events: none; max-width: 80%; text-align: center; border-bottom: 2px solid #28a745; font-size: 18px; }
                .code-textarea { width: 100%; height: 100%; background: #1e1e1e; color: #abb2bf; padding: 20px; border: none; outline: none; resize: none; font-family: 'Fira Code', monospace; }
                .terminal { background: #000; color: #0f0; padding: 15px; border-top: 1px solid #444; overflow-y: auto; }
                .term-label { font-size: 11px; color: #888; margin-bottom: 8px; }
            `}</style>
        </div>
    );
};

export default Editor;