import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  // Security Guard: Kick back to login if no token exists
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/');
  }, [navigate]);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    setIsJoining(true);
    // Simulate connection delay for UX
    setTimeout(() => {
      navigate(`/room/${roomId}`);
    }, 1500);
  };

  const generateRandomRoom = () => {
    const randomId = Math.random().toString(36).substring(2, 9);
    setRoomId(randomId);
  };

  return (
    <div className="landing-container">
      <div className="landing-card">
        <h1 style={{ fontSize: '2.5rem', marginBottom: '10px', color: '#fff' }}>
          Peer<span style={{ color: '#3b82f6' }}>Sync</span>
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
          Collaborative Real-time Lab with AI Insights
        </p>

        <form onSubmit={handleJoin}>
          <input
            type="text"
            className="room-input"
            placeholder="Enter Room ID (e.g. demo-room)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isJoining}
            style={{
              width: '100%',
              padding: '12px',
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#fff',
              marginBottom: '15px'
            }}
          />
          
          <button 
            type="submit" 
            className="join-btn" 
            disabled={isJoining}
            style={{
              width: '100%',
              padding: '12px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            {isJoining ? 'Initializing Lab...' : 'Join Workspace'}
          </button>
        </form>

        <button 
          onClick={generateRandomRoom}
          style={{ 
            background: 'transparent', 
            color: '#64748b', 
            border: 'none', 
            marginTop: '15px', 
            cursor: 'pointer', 
            fontSize: '0.9rem',
            textDecoration: 'underline'
          }}
        >
          Generate New Room ID
        </button>

        {isJoining && (
          <div style={{ marginTop: '20px' }}>
            <div className="spinner"></div>
          </div>
        )}
      </div>

      <style>{`
        .landing-container {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0f172a;
        }
        .landing-card {
          background: #1e293b;
          padding: 40px;
          border-radius: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          text-align: center;
          width: 400px;
        }
        .spinner {
          margin: 0 auto;
          width: 20px;
          height: 20px;
          border: 3px solid #334155;
          border-top-color: #3b82f6;
          borderRadius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}