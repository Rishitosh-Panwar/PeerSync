import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();
    const BACKEND_URL = "http://localhost:5000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                // SUCCESS: Send to Dashboard so they can choose/generate a room
                navigate('/dashboard'); 
            } else {
                // SECURITY: Clear any old tokens if login fails
                localStorage.removeItem('token'); 
                alert(data.message || "Invalid Credentials. Access Denied.");
            }
        } catch (err) {
            localStorage.removeItem('token');
            alert("Server connection failed.");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login to <span style={{ color: '#3b82f6' }}>PeerSync</span></h2>
                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="email@example.com"
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                        />
                    </div>
                    <button type="submit" className="auth-btn">Sign In</button>
                </form>
                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            </div>

            <style>{`
                .auth-container { height: 100vh; display: flex; align-items: center; justify-content: center; background: #0f172a; color: white; }
                .auth-card { background: #1e293b; padding: 40px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); text-align: center; }
                .input-group { text-align: left; margin-bottom: 20px; }
                .input-group label { display: block; margin-bottom: 8px; font-size: 14px; color: #94a3b8; }
                .input-group input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; }
                .auth-btn { width: 100%; padding: 12px; background: #3b82f6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; transition: background 0.2s; }
                .auth-btn:hover { background: #2563eb; }
                .auth-footer { margin-top: 20px; font-size: 14px; color: #94a3b8; }
                .auth-footer a { color: #3b82f6; text-decoration: none; }
            `}</style>
        </div>
    );
}