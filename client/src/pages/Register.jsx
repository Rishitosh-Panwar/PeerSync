import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './Register.css';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const BACKEND_URL = "http://localhost:5000";

  // Password strength indicator
  const getPasswordStrength = () => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      {/* Floating particles */}
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

      {/* Back to Home button */}
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
            />
          </div>

          <div className="register-input-group">
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

          <div className="register-input-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              disabled={isLoading}
            />
            {password && (
              <div className="password-strength">
                <div className={`strength-bar ${getPasswordStrength()}`}></div>
              </div>
            )}
          </div>

          <button type="submit" className="register-btn" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <p className="register-footer">
          Already have an account? <Link to="/login">Login here</Link>
        </p>
      </div>

      {/* Floating Shapes */}
      <div className="register-shapes">
        <div className="register-shape register-shape-1"></div>
        <div className="register-shape register-shape-2"></div>
        <div className="register-shape register-shape-3"></div>
      </div>
    </div>
  );
}