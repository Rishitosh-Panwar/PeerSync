import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

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
        <h1 className="landing-title">
          Peer<span>Sync</span>
        </h1>
        <p className="landing-subtitle">
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
          />
          
          <button 
            type="submit" 
            className="join-btn" 
            disabled={isJoining}
          >
            {isJoining ? 'Initializing Lab...' : 'Join Workspace'}
          </button>
        </form>

        <button 
          onClick={generateRandomRoom}
          className="generate-room-btn"
        >
          Generate New Room ID
        </button>

        {isJoining && (
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </div>
  );
}