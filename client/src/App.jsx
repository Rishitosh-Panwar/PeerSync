// Add at the very top of App.jsx, before any imports
// CACHE CLEARER VERSION 2.0
const clearOldCache = () => {
    const version = '2.0.0';
    const storedVersion = localStorage.getItem('app_version');
    
    if (storedVersion !== version) {
        console.log('🔄 Clearing old cache... New version:', version);
        
        // Clear all localStorage
        localStorage.clear();
        
        // Clear all sessionStorage
        sessionStorage.clear();
        
        // Clear cookies
        document.cookie.split(";").forEach(function(c) { 
            document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        });
        
        // Set new version
        localStorage.setItem('app_version', version);
        
        console.log('✅ Cache cleared!');
    }
};

// Run cache cleaner
clearOldCache();

import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import Draggable from 'react-draggable';
import jsPDF from 'jspdf'; 
import axios from 'axios';
import './App.css';


// Get backend URL from environment variable
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://peersync-backend.onrender.com";

console.log('🔗 Connecting to backend at:', BACKEND_URL);

// Create axios instance with better error handling
const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Bypass-Tunnel-Reminder": "true",
    "Content-Type": "application/json"
  },
  withCredentials: true,
  timeout: 15000
});

// Socket with multiple transport fallbacks
const socket = io(BACKEND_URL, { 
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    forceNew: true,
    extraHeaders: {
        "Bypass-Tunnel-Reminder": "true"
    }
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
    const [speechLang, setSpeechLang] = useState("en-US");
    const [jitsiToken, setJitsiToken] = useState("");
    const [jitsiActive, setJitsiActive] = useState(false);
    const [jitsiError, setJitsiError] = useState(false);

    const [showAIOverlay, setShowAIOverlay] = useState(false);
    const [aiData, setAiData] = useState(null);
    const [isVideoMaximized, setIsVideoMaximized] = useState(false);
    const [driverName, setDriverName] = useState("Anonymous");
    const [activeTab, setActiveTab] = useState('logic');
    const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const [transportType, setTransportType] = useState('unknown');

    // Add this function for hard reset
    const hardReset = () => {
        if (confirm('This will clear all data and log you out. Continue?')) {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            window.location.href = '/login';
        }
    };

    // Enhanced auth check with token refresh
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!token) {
                navigate('/login');
                return;
            }
            
            // Verify token is still valid
            try {
                const res = await api.get('/api/auth/me', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.data) {
                    // Token is valid, update user info
                    localStorage.setItem('userName', res.data.username);
                    console.log('Authenticated as:', res.data.username);
                }
            } catch (error) {
                // Token expired, try to refresh
                if (refreshToken) {
                    try {
                        const refreshRes = await api.post('/api/auth/refresh-token', { refreshToken });
                        if (refreshRes.data.token) {
                            localStorage.setItem('token', refreshRes.data.token);
                            console.log('Token refreshed successfully');
                            return;
                        }
                    } catch (refreshError) {
                        console.error('Token refresh failed:', refreshError);
                    }
                }
                
                // No valid token, redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                navigate('/login');
            }
        };
        
        checkAuth();
    }, [navigate]);

    // Monitor socket connection
    useEffect(() => {
        console.log('Setting up socket connection...');
        
        const onConnect = () => {
            const transport = socket.io.engine.transport.name;
            console.log('✅ Socket connected! Transport:', transport);
            setConnectionStatus('connected');
            setTransportType(transport);
            addNotification('success', `Connected via ${transport}`);
        };

        const onConnectError = (error) => {
            console.error('❌ Socket connection error:', error.message);
            setConnectionStatus('error');
            addNotification('error', 'Connection failed - retrying...');
            
            // Try switching transport
            if (socket.io.engine.transport.name === 'websocket') {
                console.log('Switching to polling transport...');
                socket.io.opts.transports = ['polling', 'websocket'];
            }
        };

        const onDisconnect = (reason) => {
            console.log('Socket disconnected:', reason);
            setConnectionStatus('disconnected');
            addNotification('warning', 'Disconnected from server');
        };

        const onReconnect = (attempt) => {
            console.log('Socket reconnected after', attempt, 'attempts');
            setConnectionStatus('connected');
            addNotification('success', 'Reconnected to server');
        };

        socket.on('connect', onConnect);
        socket.on('connect_error', onConnectError);
        socket.on('disconnect', onDisconnect);
        socket.on('reconnect', onReconnect);

        return () => {
            socket.off('connect', onConnect);
            socket.off('connect_error', onConnectError);
            socket.off('disconnect', onDisconnect);
            socket.off('reconnect', onReconnect);
        };
    }, []);

    // Fetch Jitsi token
    useEffect(() => {
        const getJitsiToken = async () => {
            try {
                console.log('Fetching Jitsi token...');
                const res = await api.get('/api/jitsi-token');
                console.log('✅ Jitsi token received');
                setJitsiToken(res.data.token);
            } catch (err) {
                console.error("❌ JWT Fetch Failed:", err.message);
                if (err.code === 'ECONNABORTED') {
                    addNotification('error', 'Request timeout - check backend');
                } else {
                    addNotification('error', 'Failed to initialize video call');
                }
                setJitsiError(true);
            }
        };
        getJitsiToken();
    }, []);

    // Speech Recognition
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
                        if (socket.connected) {
                            socket.emit("send_caption", { roomId, text: resultText });
                        }
                        setCurrentSentence(""); 
                    } else {
                        interimTranscript += resultText;
                        setCurrentSentence(interimTranscript);
                    }
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error:", event.error);
                setIsListening(false);
            };

            if (isListening && socket.connected) {
                try { 
                    recognitionRef.current.start(); 
                } catch(e) { 
                    console.error(e);
                    setIsListening(false);
                }
            }
        }
        return () => { 
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch(e) {}
            }
        };
    }, [speechLang, isListening, roomId]);

    // Jitsi initialization
    const initJitsi = () => {
        if (window.JitsiMeetExternalAPI && jitsiContainerRef.current && jitsiToken) {
            try {
                setJitsiActive(true);
                const domain = "8x8.vc"; 
                const options = {
                    roomName: `vpaas-magic-cookie-8f291ebf52794eb5896baaed63b01738/PeerSyncRoom-${roomId}`,
                    jwt: jitsiToken,
                    width: "100%", 
                    height: "100%",
                    parentNode: jitsiContainerRef.current,
                    configOverwrite: { 
                        prejoinPageEnabled: false,
                        startWithAudioMuted: true,
                        startWithVideoMuted: true
                    },
                    interfaceConfigOverwrite: { 
                        TILE_VIEW_MAX_COLUMNS: 2,
                        SHOW_JITSI_WATERMARK: false
                    }
                };

                jitsiApiRef.current = new window.JitsiMeetExternalAPI(domain, options);
                
                jitsiApiRef.current.addEventListeners({
                    videoConferenceLeft: () => {
                        setJitsiActive(false);
                        if (jitsiApiRef.current) jitsiApiRef.current.dispose();
                    },
                    videoConferenceJoined: () => {
                        console.log('Jitsi conference joined');
                        addNotification('success', 'Video call connected');
                    }
                });
            } catch (error) {
                console.error('Jitsi error:', error);
                setJitsiError(true);
            }
        }
    };

    // Room and socket setup
    useEffect(() => {
        if (jitsiToken && roomId && socket.connected) {
            initJitsi();
            
            const myName = localStorage.getItem('userName') || "User_" + Math.floor(Math.random() * 1000);
            socket.emit('join_room', { roomId, userName: myName });
            
            // Request driver info
            setTimeout(() => {
                socket.emit('request_driver_info', { roomId });
            }, 500);

            // Socket listeners
            const onInitialCode = (savedCode) => setCode(savedCode);
            const onCodeUpdate = (newCode) => setCode(newCode);
            const onDriverChanged = ({ driverId, driverName: newDriverName }) => {
                setIsDriver(socket.id === driverId);
                setDriverName(newDriverName);
                addNotification('info', socket.id === driverId ? '👑 You are driver!' : `👤 ${newDriverName} is driver`);
            };
            const onReceiveCaption = (data) => {
                setRemoteSubtitle(speechLang.startsWith('hi') ? data.hi : data.en);
                setTimeout(() => setRemoteSubtitle(""), 4000);
            };
            const onReceiveSummary = (data) => {
                setAiData(data);
                setShowAIOverlay(true);
                setActiveTab('logic');
                addNotification('success', '📚 AI Summary generated!');
            };
            const onReceiveOutput = (remoteOutput) => setOutput(remoteOutput);
            const onReceiveLanguage = (lang) => setLanguage(lang);

            socket.on('initial_code', onInitialCode);
            socket.on('code_update', onCodeUpdate);
            socket.on('driver_changed', onDriverChanged);
            socket.on('receive_caption', onReceiveCaption);
            socket.on('receive_summary', onReceiveSummary);
            socket.on('receive_output', onReceiveOutput);
            socket.on('receive_language', onReceiveLanguage);

            return () => { 
                socket.off('initial_code', onInitialCode);
                socket.off('code_update', onCodeUpdate);
                socket.off('driver_changed', onDriverChanged);
                socket.off('receive_caption', onReceiveCaption);
                socket.off('receive_summary', onReceiveSummary);
                socket.off('receive_output', onReceiveOutput);
                socket.off('receive_language', onReceiveLanguage);
                if (jitsiApiRef.current) jitsiApiRef.current.dispose(); 
            };
        }
    }, [roomId, jitsiToken, socket.connected, speechLang]);

    // Add notification helper
    const addNotification = (type, message) => {
        const id = Date.now();
        setNotifications(prev => [...prev, { id, type, message }]);
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 3000);
    };

    const runCode = async () => {
        setIsRunning(true);
        setOutput("🚀 Running...");
        try {
            const res = await api.post('/api/execute', { language, code });
            const result = res.data.output || "No output.";
            setOutput(result);
            if (socket.connected) {
                socket.emit("share_output", { roomId, output: result });
            }
            addNotification('success', 'Code executed');
        } catch (error) { 
            setOutput(`❌ Error: ${error.response?.data?.error || error.message}`);
            addNotification('error', 'Execution failed');
        } finally { 
            setIsRunning(false); 
        }
    };

    const generateNotes = async () => {
        setIsGenerating(true);
        try {
            const response = await api.post('/api/summarize', { roomId, transcript, code });
            if (response.data) {
                setAiData(response.data);
                setShowAIOverlay(true);
                if (socket.connected) {
                    socket.emit("share_summary", { roomId, aiData: response.data });
                }
                addNotification('success', 'AI Summary ready');
            }
        } catch (error) { 
            setOutput("❌ AI failed."); 
            addNotification('error', 'AI summary failed');
        } finally { 
            setIsGenerating(false); 
        }
    };

    const handleLanguageChange = (newLang) => {
        if (isDriver) {
            setLanguage(newLang);
            setCode(starterCode[newLang] || code); 
            if (socket.connected) {
                socket.emit("language_change", { roomId, language: newLang });
            }
        }
    };

    const handleLayoutToggle = () => {
        setIsVideoMaximized(!isVideoMaximized);
    };

    const requestToDrive = () => {
        const name = prompt("Enter your name:", localStorage.getItem('userName') || "PeerSync Coder");
        if (name && socket.connected) {
            localStorage.setItem('userName', name);
            socket.emit("claim_driver", { roomId, name });
        }
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
        
        if (aiData.flashcards?.length) {
            doc.addPage();
            doc.setFontSize(16);
            doc.text("Practice Questions", 10, 20);
            doc.setFontSize(12);
            let yPos = 40;
            aiData.flashcards.forEach((card, index) => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 40;
                }
                doc.text(`Q${index + 1}: ${card.q || card.question}`, 10, yPos);
                doc.text(`A: ${card.a || card.answer}`, 10, yPos + 15);
                yPos += 40;
            });
        }
        doc.save("PeerSync_Notes.pdf");
    };

    // Connection error screen
    if (connectionStatus === 'error' && !socket.connected) {
        return (
            <div className="connection-error">
                <h2>🔌 Connection Error</h2>
                <p>Unable to connect to server at:</p>
                <code>{BACKEND_URL}</code>
                <p>Please check:</p>
                <ul>
                    <li>Backend is running (node server.js)</li>
                    <li>Tunnel is active (cloudflared)</li>
                    <li>URL in .env is correct</li>
                </ul>
                <button onClick={() => window.location.reload()}>Refresh Page</button>
            </div>
        );
    }

    return (
        <div className="app-container">
            {/* Connection Status Bar */}
            <div className="status-bar">
                <div className={`connection-status ${connectionStatus}`}>
                    {connectionStatus === 'connected' && `🟢 Connected (${transportType})`}
                    {connectionStatus === 'connecting' && '🟡 Connecting...'}
                    {connectionStatus === 'disconnected' && '🔴 Disconnected'}
                    {connectionStatus === 'error' && '🔴 Connection Error'}
                </div>
                <div className="backend-url">
                    {BACKEND_URL}
                </div>
            </div>

            {/* Notifications */}
            <div className="notification-container">
                {notifications.map(notif => (
                    <div key={notif.id} className={`notification ${notif.type}`}>
                        {notif.message}
                    </div>
                ))}
            </div>

            {/* Rest of your UI remains the same */}
            <div className="main-workspace">
                <div className="toolbar">
                    <div className="logo-text">PeerSync</div>
                    
                    <div className="subtitle-controls">
                        <div className="language-selector">
                            <span className="selector-label">🌐</span>
                            <select 
                                value={speechLang} 
                                onChange={(e) => setSpeechLang(e.target.value)}
                                className="speech-lang-select"
                            >
                                <option value="en-US">🇺🇸 English</option>
                                <option value="hi-IN">🇮🇳 हिंदी</option>
                            </select>
                        </div>
                        <button 
                            onClick={() => setIsListening(!isListening)} 
                            className={`mic-button ${isListening ? 'active' : ''}`}
                            disabled={!socket.connected}
                        >
                            <span className="button-icon">{isListening ? '⏹️' : '🎙️'}</span>
                            <span className="button-text">{isListening ? 'Stop' : 'Speak'}</span>
                        </button>
                    </div>

                    <select 
                        value={language} 
                        onChange={(e) => handleLanguageChange(e.target.value)} 
                        className="language-select"
                        disabled={!isDriver}
                    >
                        <option value="javascript">JavaScript</option>
                        <option value="python">Python</option>
                        <option value="java">Java</option>
                        <option value="cpp">C++</option>
                    </select>
                    
                    <button 
                        onClick={runCode} 
                        disabled={isRunning || !isDriver} 
                        className="run-button"
                    >
                        <span className="button-icon">⚡</span>
                        <span>{isRunning ? "Running..." : "Run Code"}</span>
                    </button>
                    
                    <button 
                        onClick={generateNotes} 
                        disabled={isGenerating || !isDriver} 
                        className="summary-button"
                    >
                        <span className="button-icon">🤖</span>
                        <span>{isGenerating ? "Analyzing..." : "AI Summary"}</span>
                    </button>
                    
                    <button onClick={hardReset} className="reset-button" title="Clear all data and reset">
                        🗑️ Reset
                    </button>
                    
                    {!isDriver ? (
                        <button onClick={requestToDrive} className="request-button" disabled={!socket.connected}>
                            <span className="button-icon">⌨️</span>
                            <span>Request Control</span>
                        </button>
                    ) : (
                        <div className="driver-badge">
                            <span className="driver-icon">👑</span>
                            <span className="driver-text">
                                <span className="driver-label">Driver:</span>
                                <span className="driver-name">{driverName}</span>
                            </span>
                        </div>
                    )}
                </div>

                <Editor
                    height="65%"
                    theme="vs-dark"
                    language={language}
                    value={code}
                    onChange={(val) => { 
                        if(isDriver && val !== code && socket.connected) { 
                            setCode(val); 
                            socket.emit('code_update', { roomId, code: val }); 
                        } 
                    }}
                    options={{ 
                        fontSize: 16, 
                        readOnly: !isDriver,
                        automaticLayout: true
                    }}
                />
                
                <div className="output-panel">
                    <pre className="output-content">{output || "> Code output will appear here..."}</pre>
                </div>

                {(currentSentence || remoteSubtitle) && (
                    <div className="subtitle-overlay">
                        {currentSentence || remoteSubtitle}
                    </div>
                )}

                {showAIOverlay && aiData && (
                    <Draggable nodeRef={draggableNodeRef} handle=".drag-handle">
                        <div ref={draggableNodeRef} className="ai-summary-window">
                            <div className="drag-handle summary-heading">
                                <span>🧠 AI Assistant</span>
                                <div className="summary-actions">
                                    <button onClick={downloadPDF} className="pdf-button">📄 PDF</button>
                                    <button onClick={() => setShowAIOverlay(false)} className="close-button">✕</button>
                                </div>
                            </div>
                            
                            <div className="summary-tabs">
                                <button 
                                    className={`tab-button ${activeTab === 'logic' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('logic')}
                                >
                                    📝 Logic
                                </button>
                                <button 
                                    className={`tab-button ${activeTab === 'flashcards' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('flashcards')}
                                >
                                    🎴 Questions
                                </button>
                            </div>

                            <div className="summary-content">
                                {activeTab === 'logic' && (
                                    <div className="logic-section">
                                        <div className="logic-card">
                                            <h4>🎯 Approach</h4>
                                            <p>{aiData.approach || "..."}</p>
                                        </div>
                                        <div className="logic-card">
                                            <h4>💡 Logic</h4>
                                            <p>{aiData.logic || aiData.summary || "..."}</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'flashcards' && aiData.flashcards?.length > 0 && (
                                    <div className="flashcards-section">
                                        <div className="flashcard">
                                            <span className="question-number">
                                                Q{currentFlashcardIndex + 1}/{aiData.flashcards.length}
                                            </span>
                                            <p className="question">
                                                {aiData.flashcards[currentFlashcardIndex].q || 
                                                 aiData.flashcards[currentFlashcardIndex].question}
                                            </p>
                                            <p className="answer">
                                                <strong>Answer:</strong> {
                                                    aiData.flashcards[currentFlashcardIndex].a || 
                                                    aiData.flashcards[currentFlashcardIndex].answer
                                                }
                                            </p>
                                        </div>
                                        <div className="flashcard-navigation">
                                            <button onClick={() => setCurrentFlashcardIndex(
                                                prev => prev > 0 ? prev - 1 : aiData.flashcards.length - 1
                                            )}>←</button>
                                            <div className="dots">
                                                {aiData.flashcards.map((_, i) => (
                                                    <span 
                                                        key={i}
                                                        className={`dot ${i === currentFlashcardIndex ? 'active' : ''}`}
                                                        onClick={() => setCurrentFlashcardIndex(i)}
                                                    />
                                                ))}
                                            </div>
                                            <button onClick={() => setCurrentFlashcardIndex(
                                                prev => prev < aiData.flashcards.length - 1 ? prev + 1 : 0
                                            )}>→</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Draggable>
                )}
            </div>

            <div className={`video-panel ${isVideoMaximized ? 'maximized' : ''}`}>
                <button onClick={handleLayoutToggle} className="video-toggle">
                    {isVideoMaximized ? '▶' : '◀'}
                </button>
                <div ref={jitsiContainerRef} className={`jitsi-container ${jitsiActive ? 'active' : ''}`}>
                    {!jitsiToken && !jitsiError && <div className="auth-message">🔐 Authenticating Jitsi...</div>}
                    {jitsiError && (
                        <div className="jitsi-error">
                            <p>❌ Video call unavailable</p>
                            <button onClick={() => window.location.reload()}>Retry</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}