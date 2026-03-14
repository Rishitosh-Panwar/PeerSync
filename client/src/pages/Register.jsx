import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const BACKEND_URL = "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        // Navigate to Dashboard so they can choose a specific Room ID
        navigate('/dashboard'); 
      } else {
        alert(data.message || 'Registration failed');
      }
    } catch (err) {
      alert('Network Error: Make sure your backend server is running on port 5000!');
      console.error(err);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create <span style={{ color: '#3b82f6' }}>Account</span></h2>
        <p style={{ color: '#94a3b8', marginBottom: '25px', fontSize: '14px' }}>
          Join the real-time collaborative lab
        </p>

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="johndoe" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Email</label>
            <input 
              type="email" 
              placeholder="email@example.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button type="submit" className="auth-btn">Register</button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/">Login here</Link>
        </p>
      </div>

      <style>{`
        .auth-container { 
          height: 100vh; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          background: #0f172a; 
          color: white; 
          font-family: 'Inter', sans-serif;
        }
        .auth-card { 
          background: #1e293b; 
          padding: 40px; 
          border-radius: 12px; 
          width: 100%; 
          max-width: 400px; 
          box-shadow: 0 10px 25px rgba(0,0,0,0.5); 
          text-align: center; 
          border: 1px solid #334155;
        }
        .input-group { text-align: left; margin-bottom: 15px; }
        .input-group label { display: block; margin-bottom: 8px; font-size: 14px; color: #94a3b8; }
        .input-group input { 
          width: 100%; 
          padding: 12px; 
          background: #0f172a; 
          border: 1px solid #334155; 
          border-radius: 8px; 
          color: white; 
          outline: none;
        }
        .input-group input:focus { border-color: #3b82f6; }
        .auth-btn { 
          width: 100%; 
          padding: 12px; 
          background: #3b82f6; 
          color: white; 
          border: none; 
          border-radius: 8px; 
          font-weight: bold; 
          cursor: pointer; 
          margin-top: 10px;
          transition: background 0.2s; 
        }
        .auth-btn:hover { background: #2563eb; }
        .auth-footer { margin-top: 20px; font-size: 14px; color: #94a3b8; }
        .auth-footer a { color: #3b82f6; text-decoration: none; font-weight: 600; }
        .auth-footer a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}