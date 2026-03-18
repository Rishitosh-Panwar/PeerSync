import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ContactUs.css';

export default function ContactUs() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      setSubmitStatus('success');
      setIsSubmitting(false);
      setFormData({ name: '', email: '', subject: '', message: '' });
      
      // Clear success message after 5 seconds
      setTimeout(() => setSubmitStatus(null), 5000);
    }, 1500);
  };

  const contactInfo = [
    {
      icon: "📧",
      title: "Email",
      details: "hello@peersync.dev",
      action: "mailto:hello@peersync.dev"
    },
    {
      icon: "💬",
      title: "Discord",
      details: "Join our community",
      action: "https://discord.gg/peersync"
    },
    {
      icon: "🐦",
      title: "Twitter",
      details: "@peersync",
      action: "https://twitter.com/peersync"
    },
    {
      icon: "💼",
      title: "LinkedIn",
      details: "PeerSync",
      action: "https://linkedin.com/company/peersync"
    }
  ];

  const faqs = [
    {
      q: "Is PeerSync free to use?",
      a: "Yes! PeerSync is completely open-source and free for all users. We believe in accessible education for everyone."
    },
    {
      q: "How do I create a room?",
      a: "Simply log in, click 'Generate New Room ID' on the dashboard, and share the ID with your peers to start collaborating."
    },
    {
      q: "What languages are supported?",
      a: "We currently support JavaScript, Python, Java, and C++ with more languages coming soon."
    },
    {
      q: "Can I use PeerSync for commercial purposes?",
      a: "Absolutely! PeerSync is open-source under MIT license, so you're free to use it for any purpose."
    }
  ];

  return (
    <div className="contact-container">
      {/* Floating particles */}
      <div className="contact-particles">
        {[...Array(30)].map((_, i) => (
          <div key={i} className="contact-particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 10}s`,
            width: `${Math.random() * 8 + 2}px`,
            height: `${Math.random() * 8 + 2}px`
          }}></div>
        ))}
      </div>

      {/* Back to Home button */}
      <div className="contact-back-home">
        <button className="contact-back-btn" onClick={() => navigate('/home')}>
          <svg className="contact-back-arrow" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Back to Home
        </button>
      </div>

      <div className="contact-content">
        {/* Hero Section */}
        <div className="contact-hero">
          <h1 className="contact-title">
            <span className="contact-title-peer">Get in</span>
            <span className="contact-title-sync"> Touch</span>
          </h1>
          <div className="contact-title-underline"></div>
          <p className="contact-subtitle">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="contact-grid">
          {/* Contact Form */}
          <div className="contact-form-container">
            <h2>Send a Message</h2>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Your Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="john@example.com"
                />
              </div>

              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  type="text"
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                  placeholder="What's this about?"
                />
              </div>

              <div className="form-group">
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Your message here..."
                  rows="5"
                />
              </div>

              <button 
                type="submit" 
                className="submit-button"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    Send Message
                    <svg className="send-icon" viewBox="0 0 24 24">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                  </>
                )}
              </button>

              {submitStatus === 'success' && (
                <div className="success-message">
                  ✅ Message sent successfully! We'll get back to you soon.
                </div>
              )}
            </form>
          </div>

          {/* Contact Info & FAQs */}
          <div className="contact-info-container">
            {/* Quick Contact */}
            <div className="quick-contact">
              <h2>Quick Contact</h2>
              <div className="contact-cards">
                {contactInfo.map((info, index) => (
                  <a 
                    key={index}
                    href={info.action}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="contact-card"
                  >
                    <span className="contact-card-icon">{info.icon}</span>
                    <div className="contact-card-content">
                      <h3>{info.title}</h3>
                      <p>{info.details}</p>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* FAQs */}
            <div className="faq-section">
              <h2>Frequently Asked Questions</h2>
              <div className="faq-list">
                {faqs.map((faq, index) => (
                  <div key={index} className="faq-item">
                    <div className="faq-question">
                      <span className="faq-icon">❓</span>
                      <h3>{faq.q}</h3>
                    </div>
                    <p className="faq-answer">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Office Hours */}
            <div className="office-hours">
              <h2>Office Hours</h2>
              <div className="hours-grid">
                <div className="hours-item">
                  <span className="day">Monday - Friday</span>
                  <span className="time">9:00 AM - 6:00 PM EST</span>
                </div>
                <div className="hours-item">
                  <span className="day">Saturday</span>
                  <span className="time">10:00 AM - 4:00 PM EST</span>
                </div>
                <div className="hours-item">
                  <span className="day">Sunday</span>
                  <span className="time">Closed</span>
                </div>
              </div>
              <p className="response-time">
                ⏱️ We typically respond within 24 hours during business days.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Floating shapes */}
      <div className="contact-floating-shapes">
        <div className="contact-shape contact-shape-1"></div>
        <div className="contact-shape contact-shape-2"></div>
        <div className="contact-shape contact-shape-3"></div>
      </div>
    </div>
  );
}