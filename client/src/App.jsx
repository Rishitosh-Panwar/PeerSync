import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import Draggable from 'react-draggable';
import jsPDF from 'jspdf'; 
import axios from 'axios';
import './index.css';

const BACKEND_URL = "http://localhost:5000";
const socket = io(BACKEND_URL, { 
    transports: ['websocket'], 
    withCredentials: true,
    reconnectionAttempts: 5 
});

const starterCode = {
    python: "def main():\n    print('Hello from PeerSync Python!')\n\nif __name__ == '__main__':\n    main()",
    java: "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello from PeerSync Java!\");\n    }\n}",
    javascript: "console.log('Hello from PeerSync JavaScript!');",
    cpp: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello from PeerSync C++!\" << std::endl;\n    return 0;\n}"
};

export default function App() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const jitsiContainerRef = useRef(null);
    const recognitionRef = useRef(null);
    const jitsiApiRef = useRef(null);
    const draggableNodeRef = useRef(null);

    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState(starterCode.javascript);
    const [isDriver, setIsDriver] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isRunning, setIsRunning] = useState(false);
    const [transcript, setTranscript] = useState(""); 
    const [isListening, setIsListening] = useState(false);
    const [currentSentence, setCurrentSentence] = useState("");
    const [remoteSubtitle, setRemoteSubtitle] = useState("");
    const [output, setOutput] = useState("");
    const [speechLang, setSpeechLang] = useState("hi-IN");
    const [jitsiToken, setJitsiToken] = useState("");
    const [jitsiActive, setJitsiActive] = useState(true);

    const [showAIOverlay, setShowAIOverlay] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [isVideoMaximized, setIsVideoMaximized] = useState(false);
    const [driverRequest, setDriverRequest] = useState(null);

    // --- 1. Fetch Jitsi JWT ---
    useEffect(() => {
        const getJitsiToken = async () => {
            try {
                const res = await axios.get(`${BACKEND_URL}/api/jitsi-token`);
                setJitsiToken(res.data.token);
            } catch (err) {
                console.error("❌ JWT Fetch Failed:", err);
            }
        };
        getJitsiToken();
    }, []);

    // --- 2. Speech Recognition ---
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            if (recognitionRef.current) recognitionRef.current.stop();
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = speechLang;

            recognitionRef.current.onresult = (event) => {
                let interimTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    const resultText = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        setTranscript(prev => prev + " " + resultText);
                        socket.emit("send_subtitle", { roomId, text: resultText, isFinal: true });
                        setCurrentSentence(""); 
                    } else {
                        interimTranscript += resultText;
                        setCurrentSentence(interimTranscript);
                        socket.emit("send_subtitle", { roomId, text: interimTranscript, isFinal: false });
                    }
                }
            };
            if (isListening) try { recognitionRef.current.start(); } catch(e) {}
        }
        return () => { if (recognitionRef.current) recognitionRef.current.stop(); };
    }, [speechLang, isListening, roomId]);

    const toggleSpeech = () => setIsListening(!isListening);

    // --- 3. Jitsi & Socket ---
    const initJitsi = () => {
        if (window.JitsiMeetExternalAPI && jitsiContainerRef.current && jitsiToken) {
            setJitsiActive(true);
            const domain = "8x8.vc"; 
            const options = {
                roomName: `vpaas-magic-cookie-8f291ebf52794eb5896baaed63b01738/PeerSyncRoom-${roomId}`,
                jwt: jitsiToken,
                width: "100%", 
                height: "100%",
                parentNode: jitsiContainerRef.current,
                configOverwrite: { prejoinPageEnabled: false },
                interfaceConfigOverwrite: { TILE_VIEW_MAX_COLUMNS: 2 }
            };

            jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
            
            // Handle black screen on cut call
            jitsiApiRef.current.addEventListeners({
                videoConferenceLeft: () => {
                    setJitsiActive(false);
                    if (jitsiApiRef.current) jitsiApiRef.current.dispose();
                }
            });
        }
    };

    useEffect(() => {
        if (jitsiToken) {
            initJitsi();
            socket.emit('join_room', { roomId });
            
            socket.on('initial_code', (savedCode) => setCode(savedCode));
            socket.on('code_update', (newCode) => setCode(newCode));
            socket.on('token_passed', (driverId) => setIsDriver(socket.id === driverId));
            
            socket.on('receive_subtitle', (data) => {
                setRemoteSubtitle(data.text);
                if(data.isFinal) setTimeout(() => setRemoteSubtitle(""), 4000);
            });
            
            socket.on('driver_request_received', ({ requesterId, requesterName }) => {
                setDriverRequest({ requesterId, requesterName });
            });

            socket.on('receive_summary', (data) => {
                setAiData(data);
                setShowAIOverlay(true);
            });

            socket.on('receive_output', (remoteOutput) => {
                setOutput(remoteOutput);
            });

            socket.on('receive_language', (lang) => {
                setLanguage(lang);
            });

            socket.on('receive_layout', (maximized) => {
                setIsVideoMaximized(maximized);
            });

            return () => { 
                socket.off(); 
                if (jitsiApiRef.current) jitsiApiRef.current.dispose(); 
            };
        }
    }, [roomId, jitsiToken]);

    const runCode = async () => {
        setIsRunning(true);
        setOutput("🚀 PeerSync Engine running...");
        try {
            const res = await axios.post(`${BACKEND_URL}/api/execute`, { language, code });
            // FIXED PARSING FOR PISTON
            const result = res.data.run?.output || res.data.run?.stdout || res.data.output || "No output.";
            setOutput(result);
            socket.emit("share_output", { roomId, output: result });
        } catch (error) { 
            const errorMsg = error.response?.data?.error || "Code Execution Engine busy.";
            setOutput(`❌ Error: ${errorMsg}`);
        } finally { setIsRunning(false); }
    };

    const generateNotes = async () => {
        setIsGenerating(true);
        try {
            const response = await axios.post(`${BACKEND_URL}/api/summarize`, { roomId, transcript, code });
            if (response.data) {
                setAiData(response.data);
                setShowAIOverlay(true);
                socket.emit("share_summary", { roomId, aiData: response.data });
            }
        } catch (error) { 
            setOutput("❌ AI failed."); 
        } finally { setIsGenerating(false); }
    };

    const handleLanguageChange = (newLang) => {
        if (isDriver) {
            setLanguage(newLang);
            setCode(starterCode[newLang]); 
            socket.emit("language_change", { roomId, language: newLang });
        }
    };

    const handleLayoutToggle = () => {
        const newState = !isVideoMaximized;
        setIsVideoMaximized(newState);
        socket.emit("sync_layout", { roomId, isVideoMaximized: newState });
    };

    const downloadPDF = () => {
        if (!aiData) return;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text("Code Logic & Summary Report", 10, 20);
        doc.setFontSize(12);
        doc.text(`Language: ${language}`, 10, 30);
        doc.text("Logic Explanation:", 10, 40);
        doc.text(aiData.logic || aiData.summary || "No data", 10, 50, { maxWidth: 180 });
        doc.save("PeerSync_Notes.pdf");
    };

    const requestToDrive = () => {
        const userName = prompt("Enter your name to request control:") || "Someone";
        socket.emit("request_driver", { roomId, requesterName: userName });
    };

    const handleAcceptRequest = () => {
        socket.emit("accept_driver_request", { roomId, requesterId: driverRequest.requesterId });
        setDriverRequest(null);
    };

    return (
        <div style={{ width: '100%', height: '100vh', display: 'flex', background: '#0f172a', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', borderRight: '2px solid #334155' }}>
                <div style={{ padding: '10px', display: 'flex', gap: '10px', background: '#1e293b', alignItems: 'center' }}>
                    <div style={{ color: '#3b82f6', fontWeight: 'bold' }}>PeerSync Lab</div>
                    <button onClick={toggleSpeech} style={{ background: isListening ? '#ef4444' : '#3b82f6', color: 'white', padding: '5px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                        {isListening ? '🛑 Mic On' : '🎤 Mic Off'}
                    </button>
                    <select value={language} onChange={(e) => handleLanguageChange(e.target.value)} style={{ padding: '5px', borderRadius: '4px' }} disabled={!isDriver}>
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    <button onClick={runCode} disabled={isRunning || !isDriver} style={{ background: '#22c55e', color: 'white', padding: '5px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: isDriver ? 1 : 0.6 }}>
                        {isRunning ? "Running..." : "Run Code"}
                    </button>
                    <button onClick={generateNotes} disabled={isGenerating || !isDriver} style={{ background: '#a855f7', color: 'white', padding: '5px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer', opacity: isDriver ? 1 : 0.6 }}>
                        {isGenerating ? "Analyzing..." : "Summary"}
                    </button>
                    {!isDriver ? (
                        <button onClick={requestToDrive} style={{ background: '#f59e0b', color: 'white', padding: '5px 15px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                            🎮 Request Control
                        </button>
                    ) : (
                        <span style={{color: '#22c55e', fontSize: '12px'}}>🌟 You are Driver</span>
                    )}

                    {isDriver && driverRequest && (
                        <div style={{ position: 'absolute', top: '60px', right: '20px', background: '#1e293b', border: '2px solid #f59e0b', padding: '15px', borderRadius: '8px', zIndex: 200, color: 'white', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
                            <p style={{ margin: '0 0 10px 0' }}>🔔 <strong>{driverRequest.requesterName}</strong> wants control.</p>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button onClick={handleAcceptRequest} style={{ background: '#22c55e', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Accept</button>
                                <button onClick={() => setDriverRequest(null)} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Decline</button>
                            </div>
                        </div>
                    )}
                </div>

                <Editor
                    height="65%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(val) => { if(isDriver) { setCode(val); socket.emit('code_update', { roomId, code: val }); } }}
                    options={{ fontSize: 16, readOnly: !isDriver }}
                />
                
                <div style={{ height: '35%', background: '#000', color: '#0f0', padding: '15px', overflowY: 'auto', borderTop: '2px solid #334155' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{output || "> Code output will appear here..."}</pre>
                </div>

                {/* FIXED SUBTITLE OVERLAY */}
                {(currentSentence || remoteSubtitle) && (
                    <div style={{ 
                        position: 'absolute', 
                        bottom: '40%', 
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                        padding: '12px 24px', 
                        borderRadius: '8px', 
                        zIndex: 999, 
                        color: 'white',
                        border: '1px solid #3b82f6',
                        textAlign: 'center',
                        maxWidth: '80%'
                    }}>
                        {currentSentence || remoteSubtitle}
                    </div>
                )}

                {showAIOverlay && aiData && (
                    <Draggable nodeRef={draggableNodeRef} handle=".drag-handle">
                        <div ref={draggableNodeRef} style={{
                            position: 'absolute', top: '50px', left: '50px', width: '450px',
                            background: '#1e293b', color: 'white', borderRadius: '12px',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', zIndex: 1000, border: '1px solid #3b82f6'
                        }}>
                            <div className="drag-handle" style={{ 
                                padding: '12px', background: '#3b82f6', cursor: 'move', 
                                borderRadius: '10px 10px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
                            }}>
                                <span style={{ fontWeight: 'bold' }}>🧠 AI Logic Explanation</span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={downloadPDF} style={{ background: '#22c55e', border: 'none', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>PDF</button>
                                    <button onClick={() => setShowAIOverlay(false)} style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>✕</button>
                                </div>
                            </div>
                            <div style={{ padding: '20px', maxHeight: '400px', overflowY: 'auto' }}>
                                <h4 style={{ color: '#60a5fa', marginTop: 0 }}>Approach</h4>
                                <p style={{ fontSize: '14px', background: '#0f172a', padding: '10px', borderRadius: '6px' }}>{aiData.approach || "N/A"}</p>
                                <h4 style={{ color: '#60a5fa' }}>Logic</h4>
                                <p style={{ fontSize: '14px', lineHeight: '1.6' }}>{aiData.logic || aiData.summary || "No summary generated."}</p>
                            </div>
                        </div>
                    </Draggable>
                )}
            </div>

            <div style={{ 
                width: isVideoMaximized ? '800px' : '400px', 
                background: '#000', 
                position: 'relative',
                transition: 'width 0.3s ease' 
            }}>
                <button 
                    onClick={handleLayoutToggle}
                    style={{
                        position: 'absolute', top: '10px', left: '-45px', zIndex: 101,
                        background: '#3b82f6', color: 'white', border: 'none',
                        borderRadius: '4px 0 0 4px', cursor: 'pointer', padding: '10px 5px'
                    }}
                >
                    {isVideoMaximized ? '▶' : '◀'}
                </button>

                <div ref={jitsiContainerRef} style={{ width: '100%', height: '100%', display: jitsiActive ? 'block' : 'none' }}>
                    {!jitsiToken && <div style={{ color: '#fff', padding: '20px' }}>🔐 Authenticating Jitsi...</div>}
                </div>
                {!jitsiActive && (
                    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#1e293b' }}>
                        <p>Call Ended</p>
                        <button onClick={initJitsi} style={{ background: '#3b82f6', color: 'white', padding: '10px', borderRadius: '5px', border: 'none', cursor: 'pointer' }}>Restart Call</button>
                    </div>
                )}
            </div>
        </div>
    );
}