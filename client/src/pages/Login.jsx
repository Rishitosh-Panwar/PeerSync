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
            
            // Verify if token is still valid
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/verify-token`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token })
                });
                
                const data = await res.json();
                
                if (data.valid) {
                    // Token is valid, redirect to dashboard
                    navigate('/dashboard');
                } else {
                    // Token is invalid, clear it
                    localStorage.removeItem('token');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('userName');
                    localStorage.removeItem('userEmail');
                    setIsCheckingAuth(false);
                }
            } catch (err) {
                console.error('Token validation error:', err);
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                setIsCheckingAuth(false);
            }
        };
        
        checkExistingAuth();
    }, [navigate, BACKEND_URL]);

    // Polling function to check if user is verified and auto-login
    useEffect(() => {
        let pollInterval;
        let verificationAttempts = 0;
        const MAX_ATTEMPTS = 30; // 90 seconds max (3 seconds * 30)
        
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
                        // User is verified! Stop polling and auto-login
                        clearInterval(pollInterval);
                        setIsPolling(false);
                        setMessage('✅ Email verified! Logging you in...');
                        
                        // Auto-login after verification
                        setTimeout(async () => {
                            try {
                                // Get login token for the verified user
                                const tokenRes = await fetch(`${BACKEND_URL}/api/auth/get-login-token`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email })
                                });
                                
                                const tokenData = await tokenRes.json();
                                
                                if (tokenData.token) {
                                    localStorage.setItem('token', tokenData.token);
                                    localStorage.setItem('refreshToken', tokenData.refreshToken || '');
                                    localStorage.setItem('userName', tokenData.username || 'User');
                                    localStorage.setItem('userEmail', email);
                                    
                                    setMessage('Login successful! Redirecting to dashboard...');
                                    setTimeout(() => {
                                        navigate('/dashboard');
                                    }, 1500);
                                } else {
                                    setMessage('Verification complete! Please click "Send Magic Link" to login.');
                                }
                            } catch (loginErr) {
                                console.error('Auto-login error:', loginErr);
                                setMessage('Verification complete! Please click "Send Magic Link" to login.');
                            }
                        }, 1000);
                    } else if (verificationAttempts >= MAX_ATTEMPTS) {
                        // Timeout after 90 seconds
                        clearInterval(pollInterval);
                        setIsPolling(false);
                        setError('Verification timeout. Please click the link in your email and then click "Send Magic Link".');
                    }
                } catch (err) {
                    console.error('Polling error:', err);
                }
            }, 3000); // Check every 3 seconds
        }
        
        return () => {
            if (pollInterval) clearInterval(pollInterval);
        };
    }, [isPolling, email, BACKEND_URL, navigate]);

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
                // Auto-send verification link
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
                        setIsPolling(true); // Start polling for verification
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

    // Show loading while checking auth
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

                {isPolling && (
                    <div className="polling-status">
                        <div className="loading-spinner-small">⏳</div>
                        <p>Waiting for email verification...</p>
                        <small>Click the link in your email to verify. This page will auto-detect and log you in!</small>
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
                            💡 Verification link sent! Please check your email (including spam folder) and click the link.
                            <br />
                            <strong>Once verified, this page will automatically log you in!</strong>
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