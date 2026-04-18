import React, { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const featuresRef = useRef(null);
  const statsRef = useRef(null);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    // Add scroll reveal animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

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

        {/* Scroll Indicator */}
        <div className="scroll-indicator" onClick={() => scrollToSection(featuresRef)}>
          <span>Scroll to continue</span>
          <div className="scroll-arrow">↓</div>
        </div>
      </div>

      {/* Features Section */}
      <section ref={featuresRef} className="features-section scroll-reveal">
        <h2>Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Driver-Navigator Protocol</h3>
            <p>Collaborate in real-time with role-based coding sessions. One person drives while others navigate.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎥</div>
            <h3>Jitsi Integration</h3>
            <p>High-quality video calls with screen sharing, recording, and live transcription features.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Real-time Translation</h3>
            <p>Break language barriers with live caption translation supporting multiple languages.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">📝</div>
            <h3>AI-Generated Notes</h3>
            <p>Automatic summaries, logic explanations, and flashcards from your coding sessions.</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="stats-section scroll-reveal">
        <div className="stat-item">
          <div className="stat-number">5+</div>
          <div className="stat-label">Hour Sessions</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">∞</div>
          <div className="stat-label">Real-time Sync</div>
        </div>
        <div className="stat-item">
          <div className="stat-number">100%</div>
          <div className="stat-label">Open Source</div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section scroll-reveal">
        <h2>About PeerSync</h2>
        <p>PeerSync is a revolutionary platform that brings together developers from around the world to collaborate, learn, and grow together. With real-time code editing, video conferencing, and AI-powered assistance, we're making collaborative coding accessible to everyone.</p>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>© 2026 PeerSync. All rights reserved.</p>
      </footer>

      {/* Decorative Shapes */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
    </div>
  );
}