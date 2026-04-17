import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

export default function Register() {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const BACKEND_URL = "https://peersync-backend.onrender.com";

    const getPasswordStrength = () => {
        if (password.length === 0) return '';
        if (password.length < 6) return 'weak';
        if (password.length < 10) return 'medium';
        return 'strong';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        
        setIsLoading(true);
        
        try {
            const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                setMessage(data.message || 'Verification link sent! Check your terminal/console for the magic link.');
                setTimeout(() => {
                    navigate('/login');
                }, 5000);
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            setError('Network Error: Make sure your backend server is running!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="register-container">
            <div className="register-particles">
                {[...Array(20)].map((_, i) => (
                    <div key={i} className="register-particle" style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        width: `${Math.random() * 6 + 2}px`,
                        height: `${Math.random() * 6 + 2}px`
                    }}></div>
                ))}
            </div>

            <div className="register-back-home">
                <button className="register-back-btn" onClick={() => navigate('/home')}>
                    <svg className="register-back-arrow" viewBox="0 0 24 24">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to Home
                </button>
            </div>

            <div className="register-card">
                <h2 className="register-title">
                    Create <span>Account</span>
                </h2>
                <p className="register-subtitle">
                    Join the real-time collaborative lab
                </p>

                {error && <div className="error-message">{error}</div>}
                {message && <div className="success-message">{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="register-input-group">
                        <label>Username</label>
                        <input 
                            type="text" 
                            placeholder="johndoe" 
                            value={username} 
                            onChange={(e) => setUsername(e.target.value)} 
                            required 
                            disabled={isLoading}
                            minLength="3"
                        />
                    </div>

                    <div className="register-input-group">
                        <label>Email</label>
                        <input 
                            type="email" 
                            placeholder="you@example.com" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <div className="register-input-group">
                        <label>Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            disabled={isLoading}
                            minLength="6"
                        />
                        {password && (
                            <div className="password-strength">
                                <div className={`strength-bar ${getPasswordStrength()}`}></div>
                                <small>
                                    {getPasswordStrength() === 'weak' && 'Weak password'}
                                    {getPasswordStrength() === 'medium' && 'Medium password'}
                                    {getPasswordStrength() === 'strong' && 'Strong password!'}
                                </small>
                            </div>
                        )}
                    </div>

                    <div className="register-input-group">
                        <label>Confirm Password</label>
                        <input 
                            type="password" 
                            placeholder="••••••••" 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                            disabled={isLoading}
                        />
                    </div>

                    <button type="submit" className="register-btn" disabled={isLoading}>
                        {isLoading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <p className="register-footer">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
                
                <p className="terms-text">
                    By registering, you'll receive a verification link to activate your account.
                </p>
            </div>

            <div className="register-shapes">
                <div className="register-shape register-shape-1"></div>
                <div className="register-shape register-shape-2"></div>
                <div className="register-shape register-shape-3"></div>
            </div>
        </div>
    );
}