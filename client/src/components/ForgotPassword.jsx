// ForgotPassword.jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../Login.css';  // FIXED: Changed from './Login.css' to '../Login.css'

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const BACKEND_URL = "https://peersync-backend.onrender.com";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setMessage('');
        setError('');
        
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await res.json();
            setMessage(data.message || 'Password reset link sent to your email');
            
            if (res.ok) {
                setTimeout(() => {
                    navigate('/login');
                }, 5000);
            }
        } catch (err) {
            setError("Server connection failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="floating-particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="particle" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                    }}></div>
                ))}
            </div>

            <div className="back-home">
                <button className="back-home-btn" onClick={() => navigate('/login')}>
                    <svg className="back-arrow" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to Login
                </button>
            </div>

            <div className="auth-card">
                <h2 className="auth-title">
                    Reset <span>Password</span>
                </h2>
                <p className="auth-subtitle">
                    Enter your email to receive a password reset link
                </p>

                {message && <div className="success-message">{message}</div>}
                {error && <div className="error-message">{error}</div>}

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

                    <button type="submit" className="auth-btn" disabled={isLoading}>
                        {isLoading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                </form>

                <p className="auth-footer">
                    Remember your password? <Link to="/login">Login here</Link>
                </p>
            </div>
        </div>
    );
}