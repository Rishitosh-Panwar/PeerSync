// Login.jsx - Fixed version that works with App.jsx auth
import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Login.css';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isCheckingAuth, setIsCheckingAuth] = useState(true);
    const navigate = useNavigate();
    const BACKEND_URL = "https://peersync-backend.onrender.com";

    // Check if already logged in
    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await fetch(`${BACKEND_URL}/api/auth/verify-token`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token })
                    });
                    const data = await res.json();
                    if (data.valid) {
                        navigate('/dashboard');
                        return;
                    }
                } catch (err) {
                    console.error('Auth check failed:', err);
                }
            }
            setIsCheckingAuth(false);
        };
        checkAuth();
    }, [navigate, BACKEND_URL]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (res.ok && data.token) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('refreshToken', data.refreshToken || '');
                localStorage.setItem('userName', data.user?.username || email.split('@')[0]);
                localStorage.setItem('userEmail', email);
                
                setMessage('Login successful! Redirecting...');
                setTimeout(() => {
                    navigate('/dashboard');
                }, 1500);
            } else {
                setError(data.message || data.error || 'Login failed. Please check your credentials.');
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('Server connection failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');
        
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    username: email.split('@')[0],
                    email, 
                    password 
                })
            });

            const data = await res.json();

            if (res.ok) {
                setMessage('Registration successful! Please login.');
                setIsLogin(true);
                setEmail('');
                setPassword('');
            } else {
                setError(data.message || data.error || 'Registration failed');
            }
        } catch (err) {
            console.error('Register error:', err);
            setError('Server connection failed. Please try again.');
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
                    {isLogin ? 'Login to' : 'Register for'} <span>PeerSync</span>
                </h2>
                <p className="auth-subtitle">
                    {isLogin 
                        ? 'Enter your credentials to access your account'
                        : 'Create a new account to start collaborating'
                    }
                </p>

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <form onSubmit={isLogin ? handleLogin : handleRegister}>
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
                        {isLoading 
                            ? 'Processing...' 
                            : isLogin 
                                ? 'Login 🔐' 
                                : 'Register ✨'
                        }
                    </button>
                </form>

                <p className="auth-footer">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button 
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setMessage('');
                        }}
                        className="link-button"
                    >
                        {isLogin ? 'Register here' : 'Login here'}
                    </button>
                </p>
                
                <div className="demo-credentials">
                    <p>Demo Account:</p>
                    <code>Email: demo@peersync.com<br/>Password: demo123</code>
                </div>
            </div>

            <div className="floating-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>
        </div>
    );
}