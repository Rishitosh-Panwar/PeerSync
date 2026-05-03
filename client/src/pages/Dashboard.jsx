// Dashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');
    const [recentRooms, setRecentRooms] = useState([]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const name = localStorage.getItem('userName');
        
        if (!token) {
            navigate('/login');
            return;
        }
        
        setUserName(name || 'User');
        
        // Load recent rooms from localStorage
        const savedRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
        setRecentRooms(savedRooms.slice(0, 5));
    }, [navigate]);

    const createNewRoom = () => {
        const newRoomId = 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        saveRoomToHistory(newRoomId);
        navigate(`/room/${newRoomId}`);
    };

    const joinRoom = () => {
        if (roomId.trim()) {
            saveRoomToHistory(roomId);
            navigate(`/room/${roomId}`);
        }
    };

    const saveRoomToHistory = (room) => {
        const savedRooms = JSON.parse(localStorage.getItem('recentRooms') || '[]');
        if (!savedRooms.includes(room)) {
            savedRooms.unshift(room);
            localStorage.setItem('recentRooms', JSON.stringify(savedRooms.slice(0, 10)));
            setRecentRooms(savedRooms.slice(0, 5));
        }
    };

    const logout = () => {
        localStorage.clear();
        sessionStorage.clear();
        navigate('/login');
    };

    const hardReset = () => {
        if (confirm('This will clear all data and log you out. Continue?')) {
            localStorage.clear();
            sessionStorage.clear();
            document.cookie.split(";").forEach(function(c) { 
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
            });
            navigate('/login');
        }
    };

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>🚀 PeerSync Dashboard</h1>
                <div className="user-info">
                    <span>👋 Welcome, {userName}!</span>
                    <button onClick={logout} className="logout-btn">Logout</button>
                    <button onClick={hardReset} className="reset-btn" title="Clear all data">🗑️ Reset</button>
                </div>
            </div>

            <div className="dashboard-content">
                <div className="create-room-card">
                    <h2>Start a New Session</h2>
                    <p>Create a new collaborative coding room</p>
                    <button onClick={createNewRoom} className="create-btn">
                        ✨ Create New Room
                    </button>
                </div>

                <div className="join-room-card">
                    <h2>Join Existing Room</h2>
                    <p>Enter a room ID to join an existing session</p>
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="room-input"
                    />
                    <button onClick={joinRoom} className="join-btn">
                        🔗 Join Room
                    </button>
                </div>

                {recentRooms.length > 0 && (
                    <div className="recent-rooms">
                        <h3>Recent Rooms</h3>
                        <div className="rooms-list">
                            {recentRooms.map((room) => (
                                <button
                                    key={room}
                                    onClick={() => {
                                        setRoomId(room);
                                        navigate(`/room/${room}`);
                                    }}
                                    className="room-item"
                                >
                                    📁 {room}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}