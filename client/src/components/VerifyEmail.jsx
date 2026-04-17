import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

export default function VerifyEmail() {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('verifying');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const BACKEND_URL = "https://peersync-backend.onrender.com";

    useEffect(() => {
        const token = searchParams.get('token');
        
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link');
            return;
        }

        const verifyEmail = async () => {
            try {
                const res = await fetch(`${BACKEND_URL}/api/auth/verify-email?token=${token}`);
                const data = await res.json();
                
                if (res.ok) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verification failed');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Network error. Please try again.');
            }
        };

        verifyEmail();
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                {status === 'verifying' && (
                    <>
                        <div className="loading-spinner">⏳</div>
                        <h2>Verifying your email...</h2>
                        <p>Please wait while we confirm your account</p>
                    </>
                )}
                
                {status === 'success' && (
                    <>
                        <div className="success-icon">✅</div>
                        <h2>Email Verified!</h2>
                        <p>{message}</p>
                        <p>Redirecting to login page...</p>
                    </>
                )}
                
                {status === 'error' && (
                    <>
                        <div className="error-icon">❌</div>
                        <h2>Verification Failed</h2>
                        <p>{message}</p>
                        <button onClick={() => navigate('/login')} className="auth-btn">
                            Go to Login
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}