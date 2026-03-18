import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './StartingPage.css';

const StartingPage = ({ onEnter }) => {
  const containerRef = useRef(null);
  const textRef = useRef(null);
  const particlesRef = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Create floating particles effect
    const particleCount = 50;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 5 + 's';
      particle.style.width = Math.random() * 6 + 2 + 'px';
      particle.style.height = particle.style.width;
      containerRef.current.appendChild(particle);
      particlesRef.current.push(particle);
    }

    // 3D tilt effect on container
    const handleMouseMove = (e) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      
      const xRot = ((clientY / innerHeight) - 0.5) * 20;
      const yRot = ((clientX / innerWidth) - 0.5) * 20;
      
      if (containerRef.current) {
        containerRef.current.style.transform = 
          `perspective(1000px) rotateX(${xRot}deg) rotateY(${yRot}deg) translateZ(20px)`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      particlesRef.current.forEach(particle => particle.remove());
    };
  }, []);

  const handleStartJourney = () => {
    // Add exit animation
    const startingPage = document.querySelector('.starting-page');
    if (startingPage) {
      startingPage.style.animation = 'fadeOut 0.5s ease-out forwards';
    }
    
    setTimeout(() => {
      if (onEnter) {
        onEnter();
      } else {
        navigate('/home');
      }
    }, 500);
  };

  return (
    <div className="starting-page" ref={containerRef}>
      {/* Notebook paper lines background */}
      <div className="notebook-lines"></div>
      <div className="notebook-holes"></div>
      
      {/* Main content */}
      <div className="content-wrapper">
        <div className="logo-container">
          <div className="logo-3d">
            <div className="logo-ring"></div>
            <div className="logo-ring"></div>
            <div className="logo-ring"></div>
            <div className="logo-core">
              <span className="logo-text">PS</span>
            </div>
          </div>
        </div>

        <div className="title-container" ref={textRef}>
          <h1 className="main-title">
            <span className="title-word peer">Peer</span>
            <span className="title-word sync">Sync</span>
          </h1>
          <div className="title-underline"></div>
        </div>

        <div className="description-container">
          <p className="tagline">
            An AI-Powered Cloud Ecosystem for Collaborative Learning
          </p>
          
          <div className="feature-grid">
            <div className="feature-item">
              <div className="feature-icon">🤝</div>
              <span>Driver-Navigator Protocol</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🎥</div>
              <span>Jitsi Integration</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🌐</div>
              <span>Real-time Translation</span>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📝</div>
              <span>AI-Generated Notes</span>
            </div>
          </div>

          {/* New Start Your Journey Button */}
          <button className="journey-button" onClick={handleStartJourney}>
            <span>Start Your Journey</span>
            <svg className="button-arrow" viewBox="0 0 24 24">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </button>

          {/* Secondary link for returning users */}
          <p className="returning-text">
            Already have an account? <button onClick={() => navigate('/login')} className="returning-link">Sign In</button>
          </p>
        </div>

        {/* Animated stats */}
        <div className="stats-container">
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

      {/* Decorative elements */}
      <div className="floating-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>
      {/* Scroll indicator */}
<div className="scroll-indicator">
  <span className="scroll-text">Scroll to continue</span>
  <div className="scroll-arrow"></div>
</div>
    </div>
  );
};

export default StartingPage;