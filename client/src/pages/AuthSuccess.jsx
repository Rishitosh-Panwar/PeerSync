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
            localStorage.setItem('auth_verified', 'false');
            navigate(`/login?error=${error}`);
            return;
        }

        if (token && refreshToken) {
            // Set verification flag for the original tab
            localStorage.setItem('auth_verified', 'true');
            
            // Store tokens in localStorage
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('userName', username);
            localStorage.setItem('userEmail', email);
            
            // Show success message and close tab
            console.log('Authentication successful! You can close this tab.');
            
            // Try to close the tab
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            localStorage.setItem('auth_verified', 'false');
            navigate('/login?error=invalid_response');
        }
    }, [searchParams, navigate]);

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="loading-spinner">⏳</div>
                <h2>Authentication Successful! 🎉</h2>
                <p>You are now logged in to PeerSync.</p>
                <p><small>You can close this tab and return to your original tab.</small></p>
            </div>
        </div>
    );
}