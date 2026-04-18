import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

export default function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const type = searchParams.get('type');
        
        console.log('AuthCallback - Verifying email...');
        
        if (!token) {
            console.error('No token in callback URL');
            navigate('/login?error=invalid_token');
            return;
        }
        
        // Forward to backend callback endpoint
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'https://peersync-backend.onrender.com';
        const callbackUrl = `${backendUrl}/api/auth/auth/callback?token=${token}&type=${type}`;
        
        console.log('Redirecting to backend for verification...');
        
        // Redirect to backend callback (this will verify and redirect back to login with ?verified=true)
        window.location.href = callbackUrl;
        
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="loading-spinner">⏳</div>
                <h2>Verifying Your Email...</h2>
                <p>Please wait while we verify your email address.</p>
                <p><small>You will be redirected back to the login page automatically.</small></p>
            </div>
        </div>
    );
}