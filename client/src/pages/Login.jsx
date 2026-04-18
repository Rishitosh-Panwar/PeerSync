import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [needsVerification, setNeedsVerification] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [pollingCount, setPollingCount] = useState(0);
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const navigate = useNavigate();
    const BACKEND_URL = "https://peersync-backend.onrender.com";

    // Listen for storage events (when verification happens in another tab)
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === 'auth_verified' && e.newValue === 'true') {
                console.log('Verification detected in another tab!');
                // Remove the flag
                localStorage.removeItem('auth_verified');
                // Trigger auto-login
                if (email) {
                    performAutoLogin(email);
                }
            }
        };
        
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [email]);

    // Check URL for error params and validate existing token
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get('error');
        if (errorParam) {
            setError(decodeURIComponent(errorParam));
        }
        
        // Validate existing token before redirecting
        const checkExistingAuth = async () => {
            const token = localStorage.getItem('token');
            
            if (!token) {
                setIsCheckingAuth(false);
                return;
            }
            
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/verify-token`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token })
                });
                
                const data = await res.json();
                
                if (data.valid && data.user) {
                    navigate('/dashboard');
                } else {
                    localStorage.clear();
                    sessionStorage.clear();
                    setIsCheckingAuth(false);
                }
            } catch (err) {
                localStorage.clear();
                sessionStorage.clear();
                setIsCheckingAuth(false);
            }
        };
        
        checkExistingAuth();
    }, [navigate, BACKEND_URL]);

    const performAutoLogin = async (userEmail) => {
        setMessage('✅ Email verified! Logging you in...');
        
        try {
            const tokenRes = await fetch(`${BACKEND_URL}/api/auth/get-login-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: userEmail })
            });
            
            const tokenData = await tokenRes.json();
            
            if (tokenData.token) {
                localStorage.setItem('token', tokenData.token);
                localStorage.setItem('refreshToken', tokenData.refreshToken || '');
                localStorage.setItem('userName', tokenData.username || 'User');
                localStorage.setItem('userEmail', userEmail);
                
                setMessage('Login successful! Redirecting to dashboard...');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            } else {
                setMessage('Verification complete! Please click "Send Magic Link" to login.');
                setIsPolling(false);
            }
        } catch (loginErr) {
            console.error('Auto-login error:', loginErr);
            setMessage('Verification complete! Please click "Send Magic Link" to login.');
            setIsPolling(false);
        }
    };

    // Polling function to check if user is verified
    useEffect(() => {
        let pollInterval;
        let verificationAttempts = 0;
        const MAX_ATTEMPTS = 30;
        
        if (isPolling && email) {
            pollInterval = setInterval(async () => {
                verificationAttempts++;
                setPollingCount(verificationAttempts);
                
                try {
                    const res = await fetch(`${BACKEND_URL}/api/auth/check-verification`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email })
                    });
                    
                    const data = await res.json();
                    
                    if (data.isVerified) {
                        clearInterval(pollInterval);
                        setIsPolling(false);
                        await performAutoLogin(email);
                    } else if (verificationAttempts >= MAX_ATTEMPTS) {
                        clearInterval(pollInterval);
                        setIsPolling(false);
                        setError('Verification timeout. Please click "Send Magic Link" again.');
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000);
        }
        
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isPolling, email, BACKEND_URL]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        setNeedsVerification(false);
        
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('Magic link sent! Check your email for the login link.');
                setEmail('');
            } else if (res.status === 401 && data.needsVerification) {
                setMessage('📧 Verification needed. Sending verification link to your email...');
                
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
                        setIsPolling(true);
                        setPollingCount(0);
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

    if (isCheckingAuth) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <div className="loading-spinner">⏳</div>
                    <h2>Loading...</h2>
                    <p>Please wait while we verify your session.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
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

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                {isPolling && (
                    <div className="polling-status">
                        <div className="loading-spinner-small">⏳</div>
                        <p>Waiting for email verification...</p>
                        <small>Click the link in your email. This page will automatically log you in!</small>
                        <div className="polling-progress">
                            <div className="progress-bar" style={{ width: `${(pollingCount / 30) * 100}%` }}></div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label>Email Address</label>
                        <input 
                            type="email" 
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading || isPolling}
                        />
                    </div>

                    <button type="submit" className="auth-btn" disabled={isLoading || isPolling}>
                        {isLoading ? 'Sending Magic Link...' : isPolling ? 'Waiting for Verification...' : 'Send Magic Link ✨'}
                    </button>
                </form>

                <p className="auth-footer">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
                
                {needsVerification && (
                    <div className="info-text">
                        <small>
                            💡 Verification link sent! Please check your email and click the link.
                            <br />
                            <strong>This page will automatically log you in once verified!</strong>
                        </small>
                    </div>
                )}
            </div>

            <div className="floating-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>
        </div>
    );
}