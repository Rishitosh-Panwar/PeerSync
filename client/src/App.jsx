import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import { useParams, useNavigate } from 'react-router-dom';
import './index.css';

const socket = io('http://localhost:3000');

export default function App() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isDriver, setIsDriver] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [summaryData, setSummaryData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const jitsiUrl = `https://meet.jit.si/peersync-${roomId}`;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/');
      return;
    }

    socket.emit('join_room', { roomId });

    socket.on('initial_code', (savedCode) => {
      setCode(savedCode);
    });

    socket.on('code_update', (newCode) => {
      setCode(newCode);
    });

    socket.on('token_passed', (socketId) => {
      setIsDriver(socket.id === socketId);
    });

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => prev + 1);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('initial_code');
      socket.off('code_update');
      socket.off('token_passed');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [navigate, roomId]);

  const handleEditorChange = (value) => {
    if (isDriver) {
      setCode(value);
      socket.emit('code_update', { roomId, code: value });
    }
  };

  const takeControl = () => {
    socket.emit('pass_token', { roomId, targetSocketId: socket.id });
  };

  const generateNotes = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('http://localhost:3000/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chatHistory: [],
          code: code
        }),
      });
      const data = await response.json();
      setSummaryData(data);
    } catch (error) {
      console.error(error);
    }
    setIsGenerating(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/');
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ padding: '10px', background: '#1e1e1e', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', color: 'white', alignItems: 'center' }}>
          <div>
            <button
              onClick={isDriver ? null : takeControl}
              style={{ padding: '8px 16px', cursor: 'pointer', marginRight: '10px', background: isDriver ? '#28a745' : '#444', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              {isDriver ? 'You are the Driver' : 'Take Control'}
            </button>
            <button
              onClick={generateNotes}
              disabled={isGenerating}
              style={{ padding: '8px 16px', cursor: isGenerating ? 'not-allowed' : 'pointer', background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px', marginRight: '10px' }}
            >
              {isGenerating ? 'Generating...' : 'Generate AI Notes'}
            </button>
            <button
              onClick={handleLogout}
              style={{ padding: '8px 16px', cursor: 'pointer', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              Logout
            </button>
          </div>
          <div style={{ fontWeight: 'bold', color: tabSwitchCount > 0 ? '#ff4444' : '#28a745' }}>
            Tab Switches (Focus Lost): {tabSwitchCount}
          </div>
        </div>

        <div style={{ flexGrow: 1 }}>
          <Editor
            height="100%"
            width="100%"
            theme="vs-dark"
            defaultLanguage="javascript"
            value={code}
            onChange={handleEditorChange}
            options={{ readOnly: !isDriver }}
          />
        </div>

        {summaryData && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: '#1e1e1e', color: '#d4d4d4', padding: '20px', borderTop: '2px solid #007acc', maxHeight: '45%', overflowY: 'auto', boxShadow: '0 -4px 15px rgba(0,0,0,0.5)', zIndex: 10 }}>
            <button
              onClick={() => setSummaryData(null)}
              style={{ float: 'right', padding: '6px 12px', cursor: 'pointer', background: '#d32f2f', color: '#fff', border: 'none', borderRadius: '4px' }}
            >
              Close
            </button>
            <h3 style={{ marginBottom: '15px', color: '#569cd6' }}>Session Summary</h3>
            <p style={{ marginBottom: '25px', lineHeight: '1.6', fontSize: '15px' }}>{summaryData.summary}</p>

            <h3 style={{ marginBottom: '15px', color: '#569cd6' }}>Flashcards</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '15px' }}>
              {summaryData.flashcards?.map((fc, index) => (
                <div key={index} style={{ background: '#252526', padding: '15px', borderRadius: '6px', borderLeft: '4px solid #ce9178' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#9cdcfe' }}>Q: {fc.question}</div>
                  <div style={{ color: '#d4d4d4' }}>A: {fc.answer}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '400px', background: '#000', borderLeft: '1px solid #333' }}>
        <iframe
          src={jitsiUrl}
          allow="camera; microphone; fullscreen; display-capture"
          style={{ width: '100%', height: '100%', border: 'none' }}
          title="Jitsi Video Call"
        />
      </div>
    </div>
  );
}