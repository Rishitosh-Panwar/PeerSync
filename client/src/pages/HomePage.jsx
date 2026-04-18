import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="home-container">
      {/* Notebook paper effect */}
      <div className="notebook-lines"></div>
      <div className="notebook-holes"></div>
      
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

      {/* Main Content */}
      <div className="home-content">
        <div className="logo-section">
          <div className="logo-3d">
            <div className="logo-ring"></div>
            <div className="logo-ring"></div>
            <div className="logo-ring"></div>
            <div className="logo-core">
              <span className="logo-text">PS</span>
            </div>
          </div>
        </div>

        <h1 className="home-title">
          <span className="title-peer">Peer</span>
          <span className="title-sync">Sync</span>
        </h1>
        
        <p className="home-tagline">
          An AI-Powered Cloud Ecosystem for Collaborative Learning
        </p>

        <div className="features-preview">
          <div className="feature-pill">🤝 Driver-Navigator Protocol</div>
          <div className="feature-pill">🎥 Jitsi Integration</div>
          <div className="feature-pill">🌐 Real-time Translation</div>
          <div className="feature-pill">📝 AI-Generated Notes</div>
        </div>

        <div className="action-buttons">
          <button 
            className="login-btn"
            onClick={() => navigate('/login')}
          >
            <span>Login</span>
            <svg className="btn-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
          
          <button 
            className="register-btn"
            onClick={() => navigate('/register')}
          >
            <span>Register</span>
            <svg className="btn-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>
        </div>

        <div className="footer-links">
          <button className="footer-link" onClick={() => navigate('/about')}>
            About Us
          </button>
          <span className="footer-separator">•</span>
          <button className="footer-link" onClick={() => navigate('/contact')}>
            Contact Us
          </button>
        </div>

        {/* Stats Section */}
        <div className="home-stats">
          <div className="stat-item">
            <span className="stat-number">5+</span>
            <span className="stat-label">Hour Sessions</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">∞</span>
            <span className="stat-label">Real-time Sync</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">100%</span>
            <span className="stat-label">Open Source</span>
          </div>
        </div>
      </div>

      {/* Decorative Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );
}