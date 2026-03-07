import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import './index.css'; // Ensure your index.css has the Glassmorphism styles

const socket = io('http://localhost:5000');

export default function App() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [transcript, setTranscript] = useState(""); 

  const jitsiUrl = `https://meet.jit.si/peersync-${roomId}`;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/'); return; }

    socket.emit('join_room', { roomId });

    // Real-Time Speech Recognition (Hindi to English)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.lang = 'hi-IN';
      recognition.onresult = async (event) => {
        const hindiText = event.results[event.results.length - 1][0].transcript;
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(hindiText)}&langpair=hi|en`);
        const data = await res.json();
        setTranscript(prev => prev + " " + data.responseData.translatedText);
      };
      recognition.start();
    }

    const downloadPDF = () => {
  const doc = new jsPDF();
  
  // PDF Styling
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PeerSync Session Notes", 20, 20);
  
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(`Room ID: ${roomId}`, 20, 30);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 35);
  
  doc.line(20, 40, 190, 40); // Horizontal line

  doc.setFont("helvetica", "bold");
  doc.text("AI Summary:", 20, 50);
  
  doc.setFont("helvetica", "normal");
  // Split text to fit page width
  const splitText = doc.splitTextToSize(summaryData.summary, 170);
  doc.text(splitText, 20, 60);

  if (summaryData.youtube) {
    doc.setTextColor(0, 0, 255);
    doc.text(`Tutorial: ${summaryData.youtube.link}`, 20, doc.lastAutoTable?.finalY + 20 || 150);
  }

  doc.save(`PeerSync_Notes_${roomId}.pdf`);
};

// ... Update your Summary Window JSX to include the button:
<button onClick={downloadPDF} className="pdf-btn">
  Download PDF
</button>

    socket.on('initial_code', (savedCode) => setCode(savedCode));
    socket.on('code_update', (newCode) => setCode(newCode));
    socket.on('token_passed', (socketId) => setIsDriver(socket.id === socketId));

    const handleVisibilityChange = () => {
      if (document.hidden) setTabSwitchCount(prev => prev + 1);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, roomId]);

  const generateNotes = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:5000/api/video/process-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript || "Collaborative coding session on PeerSync.",
          topic: "Web Development Lab"
        }),
      });
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error("AI Error:", error);
    }
    setIsGenerating(false);
  };

  const downloadNotes = () => {
    const element = document.createElement("a");
    const file = new Blob([summaryData.summary], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `PeerSync_Notes_${roomId}.txt`;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', background: '#0f172a' }}>
      
      {/* LEFT: Editor Section */}
      <div className={`editor-container ${isDriver ? 'editor-active' : 'editor-read-only'}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        
        {/* Modern Header */}
        <div style={{ padding: '15px 25px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => socket.emit('pass_token', { roomId, targetSocketId: socket.id })}
              style={{ padding: '10px 18px', background: isDriver ? '#22c55e' : '#334155', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: '600', transition: '0.3s' }}
            >
              {isDriver ? '🟢 Control: Active' : '⌨️ Request Control'}
            </button>
            <button
              onClick={generateNotes}
              disabled={isGenerating}
              style={{ padding: '10px 18px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: '600' }}
            >
              {isGenerating ? '⌛ Processing...' : '✨ AI Summary'}
            </button>
          </div>
          <div style={{ padding: '8px 16px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: tabSwitchCount > 2 ? '#f87171' : '#4ade80', fontSize: '14px' }}>
            Tab Switches: <strong>{tabSwitchCount}</strong>
          </div>
        </div>

        {/* The Code Editor */}
        <Editor
          height="100%"
          theme="vs-dark"
          defaultLanguage="javascript"
          value={code}
          onChange={(val) => isDriver && socket.emit('code_update', { roomId, code: val })}
          options={{ readOnly: !isDriver, fontSize: 16, minimap: { enabled: false }, padding: { top: 20 } }}
        />

        {/* POLISHED AI SUMMARY WINDOW (Glassmorphism) */}
        {summaryData && (
          <div className="ai-summary-window">
            <button onClick={() => setSummaryData(null)} style={{ float: 'right', background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            
            <div className="summary-heading">
              <span>🤖</span> AI Session Analysis
            </div>
            
            <p style={{ color: '#cbd5e1', lineHeight: '1.6', fontSize: '15px', marginBottom: '20px' }}>
              {summaryData.summary}
            </p>

            {summaryData.youtube && (
              <div className="yt-card">
                <div style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>📺</span> Recommended for You
                </div>
                <a href={summaryData.youtube.link} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: '500' }}>
                  {summaryData.youtube.title} →
                </a>
              </div>
            )}

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
               <button onClick={() => navigator.clipboard.writeText(summaryData.summary)} style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid #334155', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Copy Text</button>
               <button onClick={downloadNotes} style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid #3b82f6', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Download .txt</button>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Video Section */}
      <div style={{ width: '400px', background: '#000', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1 }}>
          <iframe
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture"
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </div>
        {/* Translucent Live Caption Bar */}
        <div style={{ padding: '15px', background: '#1e293b', borderTop: '1px solid #334155', fontSize: '13px', color: '#94a3b8' }}>
          <div style={{ color: '#4ade80', fontWeight: 'bold', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase' }}>Live Translation</div>
          {transcript ? transcript.slice(-80) + "..." : "Waiting for audio..."}
        </div>
      </div>
    </div>
  );
  
}