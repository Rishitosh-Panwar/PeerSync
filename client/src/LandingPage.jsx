import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const [roomId, setRoomId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomId.trim()) return;

    setIsJoining(true);
    // Simulate a "Secure Connection" delay
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
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isJoining}
          />
          
          <button type="submit" className="join-btn" disabled={isJoining}>
            {isJoining ? 'Initializing Lab...' : 'Join Workspace'}
          </button>
        </form>

        <button 
          onClick={generateRandomRoom}
          style={{ background: 'transparent', color: '#64748b', border: 'none', marginTop: '15px', cursor: 'pointer', fontSize: '0.9rem' }}
        >
          Generate New Room ID
        </button>

        {isJoining && (
          <div style={{ marginTop: '20px' }}>
            <div className="spinner" style={{ margin: '0 auto', width: '20px', height: '20px', border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}