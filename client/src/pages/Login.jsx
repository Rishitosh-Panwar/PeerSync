import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const BACKEND_URL = "http://localhost:5000";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
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
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Floating particles */}
            <div className="floating-particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="particle" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        width: `${Math.random() * 6 + 2}px`,
                        height: `${Math.random() * 6 + 2}px`
                    }}></div>
                ))}
            </div>

            {/* Back to Home button */}
            <div className="back-home">
                <button className="back-home-btn" onClick={() => navigate('/home')}>
                    <svg className="back-arrow" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to Home
                </button>
            </div>

            <div className="auth-card">
                <h2 className="auth-title">
                    Login to <span>PeerSync</span>
                </h2>
                <p className="auth-subtitle">
                    Enter your credentials to access the collaborative lab
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="email@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading}
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
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="auth-btn" disabled={isLoading}>
                        {isLoading ? 'Authenticating...' : 'Sign In'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
            </div>

            {/* Floating Shapes */}
            <div className="floating-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>
        </div>
    );
}