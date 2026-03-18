import React from 'react';
import { useNavigate } from 'react-router-dom';
import './AboutUs.css';

export default function AboutUs() {
  const navigate = useNavigate();

  const teamMembers = [
    {
      name: "Rishitosh Panwar",
      role: "Backend Architect",
      bio: "Focused on backend development, real-time communication using Socket.io, and cloud storage integration, ensuring seamless system performance.",
      icon: "⚙️"
    },
    {
      name: "Tanushree Nayal",
      role: "Full-Stack Integrator",
      bio: "Led the overall system design and integration, contributing across modules including AI features, collaboration logic, and platform architecture.",
      icon: "👨‍💻"
    },
    {
      name: "Harsh Kumar",
      role: "Frontend Developer",
      bio: "Worked on frontend development and UI implementation, building an intuitive and responsive user interface using React.",
      icon: "🤖"
    }

  ];

  const milestones = [
    { year: "2023", event: "🚀 Project inception - Solving tool fragmentation in remote education" },
    { year: "2024 Q1", event: "💡 Driver-Navigator protocol implemented" },
    { year: "2024 Q2", event: "🌐 Jitsi integration & real-time translation added" },
    { year: "2024 Q3", event: "🧠 AI summary & flashcard generation launched" },
    { year: "2025", event: "⭐ Open source release & community beta" },
    { year: "Jan 2026", event: "🎯 10,000+ active users milestone reached" },
    { year: "Feb 2026", event: "🤖 Gemini 2.5 Flash integration for enhanced AI learning" },
    { year: "Mar 2026", event: "📊 Advanced analytics dashboard launched" },
    { year: "2026", event: "⚡ Scaling infrastructure for global real-time collaboration" }
  ];

  return (
    <div className="about-container">
      {/* Floating particles */}
      <div className="about-particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="about-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            width: `${Math.random() * 8 + 2}px`,
            height: `${Math.random() * 8 + 2}px`
          }}></div>
        ))}
      </div>

      {/* Back to Home button */}
      <div className="about-back-home">
        <button className="about-back-btn" onClick={() => navigate('/home')}>
          <svg className="about-back-arrow" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </button>
      </div>

      <div className="about-content">
        {/* Hero Section */}
        <div className="about-hero">
          <h1 className="about-title">
            <span className="about-title-peer">About</span>
            <span className="about-title-sync"> PeerSync</span>
          </h1>
          <div className="about-title-underline"></div>
          <p className="about-subtitle">
            Redefining collaborative learning through AI-powered technology
          </p>
        </div>

        {/* Mission Statement */}
        <div className="about-mission">
          <div className="mission-card">
            <div className="mission-icon">🎯</div>
            <h2>Our Mission</h2>
            <p>
              To eliminate tool fragmentation in remote education by creating 
              a unified, intelligent platform where students can code, communicate, 
              and learn together in real-time.
            </p>
          </div>
        </div>

        {/* Problem & Solution */}
        <div className="problem-solution">
          <div className="problem-card">
            <h3>
              <span className="card-icon">⚠️</span>
              The Problem
            </h3>
            <p>
              Students juggle 5+ disconnected tools for video, chat, coding, and notes. 
              Context switching kills productivity and learning flow.
            </p>
          </div>
          <div className="solution-card">
            <h3>
              <span className="card-icon">💡</span>
              Our Solution
            </h3>
            <p>
              PeerSync consolidates everything into one seamless environment with 
              AI-powered insights, real-time translation, and structured collaboration.
            </p>
          </div>
        </div>

        {/* Core Features */}
        <div className="about-features">
          <h2 className="section-title">Core Innovations</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon-large">🎮</div>
              <h3>Driver-Navigator Protocol</h3>
              <p>Token-based write access eliminates conflicts, enabling structured pair programming like professional dev teams.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🤖</div>
              <h3>AI Learning Assistant</h3>
              <p>Generates summaries, flashcards, and YouTube learning paths from your coding sessions automatically.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">🌐</div>
              <h3>Real-time Translation</h3>
              <p>Break language barriers with instant Hindi-English translation of voice and captions.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-large">📦</div>
              <h3>Cloud-Native Architecture</h3>
              <p>Dockerized microservices with CI/CD pipelines ensure scalability and reliability.</p>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="about-timeline">
          <h2 className="section-title">Our Journey</h2>
          <div className="timeline">
            {milestones.map((item, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-year">{item.year}</div>
                <div className="timeline-event">{item.event}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team */}
        <div className="about-team">
          <h2 className="section-title">Meet the Team</h2>
          <div className="team-grid">
            {teamMembers.map((member, index) => (
              <div key={index} className="team-card">
                <div className="team-icon">{member.icon}</div>
                <h3>{member.name}</h3>
                <p className="team-role">{member.role}</p>
                <p className="team-bio">{member.bio}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="about-stats">
          <div className="stat-card">
            <span className="stat-number">500+</span>
            <span className="stat-label">Active Users</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">1,200+</span>
            <span className="stat-label">Sessions</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">50K+</span>
            <span className="stat-label">Lines of Code</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">24/7</span>
            <span className="stat-label">Availability</span>
          </div>
        </div>

        {/* Call to Action */}
        <div className="about-cta">
          <h2>Ready to transform your learning?</h2>
          <div className="cta-buttons">
            <button className="cta-primary" onClick={() => navigate('/register')}>
              Get Started Free
            </button>
            <button className="cta-secondary" onClick={() => navigate('/contact')}>
              Contact Us
            </button>
          </div>
        </div>
      </div>

      {/* Floating shapes */}
      <div className="about-floating-shapes">
        <div className="about-shape about-shape-1"></div>
        <div className="about-shape about-shape-2"></div>
        <div className="about-shape about-shape-3"></div>
        <div className="about-shape about-shape-4"></div>
      </div>
    </div>
  );
}