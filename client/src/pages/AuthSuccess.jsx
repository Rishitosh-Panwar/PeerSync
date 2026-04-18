import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './Login.css';

export default function AuthSuccess() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const refreshToken = searchParams.get('refreshToken');
        const username = searchParams.get('username');
        const email = searchParams.get('email');
        const error = searchParams.get('error');

        if (error) {
            navigate(`/login?error=${error}`);
            return;
        }

        if (token && refreshToken) {
            // Store tokens
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('userName', username);
            localStorage.setItem('userEmail', email);
            
            // Redirect to dashboard
            navigate('/dashboard');
        } else {
            navigate('/login?error=invalid_response');
        }
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="loading-spinner">⏳</div>
                <h2>Authentication Successful! 🎉</h2>
                <p>Redirecting to dashboard...</p>
            </div>
        </div>
    );
}