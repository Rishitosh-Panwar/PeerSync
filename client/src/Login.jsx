import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/room/demo-room');
      } else {
        alert(data.message || 'Login failed');
      }
    } catch (err) {
      alert('Network Error: Make sure your backend server (nodemon) is running on port 3000!');
      console.error(err);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#1e1e1e', color: '#fff' }}>
      <form onSubmit={handleSubmit} style={{ background: '#252526', padding: '40px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '15px', width: '300px' }}>
        <h2 style={{ textAlign: 'center', margin: 0 }}>Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', background: '#3c3c3c', color: '#fff' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ padding: '10px', borderRadius: '4px', border: '1px solid #333', background: '#3c3c3c', color: '#fff' }} />
        <button type="submit" style={{ padding: '10px', background: '#007acc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Login</button>
        <div style={{ textAlign: 'center', fontSize: '14px' }}>
          Don't have an account? <Link to="/register" style={{ color: '#007acc' }}>Register</Link>
        </div>
      </form>
    </div>
  );
}