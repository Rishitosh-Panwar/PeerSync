import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App.jsx';
import Login from './Login.jsx';
import Register from './Register.jsx';
import './index.css';
import LandingPage from './LandingPage';
import LabRoom from './App';


ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/room/:roomId" element={<App />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/room/:roomId" element={<LabRoom />} />
    </Routes>
  </BrowserRouter>
);

