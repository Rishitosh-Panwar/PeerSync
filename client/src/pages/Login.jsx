import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const navigate = useNavigate();
    const BACKEND_URL = "https://peersync-backend.onrender.com";

    // Check URL for error params
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        if (errorParam) {
            setError(decodeURIComponent(errorParam));
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        setNeedsVerification(false);
        
        try {
            console.log('Sending login request for:', email);
            
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            console.log('Response status:', res.status);
            const data = await res.json();
            console.log('Response data:', data);

            if (res.ok) {
                setMessage(data.message || 'Magic link sent! Check your email for the login link.');
                setEmail('');
            } else if (res.status === 401 && data.needsVerification) {
                // Auto-send verification link without requiring resend button
                setMessage('Verification needed. Sending verification link to your email...');
                
                try {
                    const resendRes = await fetch(`${BACKEND_URL}/api/auth/resend-verification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    
                    const resendData = await resendRes.json();
                    
                    if (resendRes.ok) {
                        setMessage('✅ Verification link sent! Please check your email and click the link to verify your account.');
                        setNeedsVerification(true);
                    } else {
                        setError(resendData.message || 'Failed to send verification link');
                    }
                } catch (resendErr) {
                    console.error('Auto-resend error:', resendErr);
                    setError('Failed to send verification link. Please try again.');
                }
            } else {
                setError(data.message || 'Something went wrong');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError("Server connection failed. Please try again.");
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
                <button className="back-home-btn" onClick={() => navigate('/')}>
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
                    Enter your email to receive a magic login link
                </p>

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}
                
                {message && <div className="success-message">{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={isLoading}>
                        {isLoading ? 'Sending Magic Link...' : 'Send Magic Link ✨'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
                
                {needsVerification && (
                    <div className="info-text">
                        <small>
                            💡 Verification link sent! Please check your email (including spam folder) and click the link to verify your account.
                            <br />
                            After verification, return here and click "Send Magic Link" again to login.
                        </small>
                    </div>
                )}
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