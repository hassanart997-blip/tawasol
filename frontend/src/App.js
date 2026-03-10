import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';
import './App.css';

const api = axios.create({
    baseURL: 'https://tawasol-eta.vercel.app/api',
    withCredentials: false
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/profile')
                .then(response => {
                    setUser(response.data);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const handleLogin = async (email, password) => {
        try {
            const response = await api.post('/login', { email, password });
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            return { success: true };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.error || 'حدث خطأ في تسجيل الدخول'
            };
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    if (loading) return <div className="loading">جاري التحميل...</div>;

    return (
        <Router>
            <div className="app">
                {user ? (
                    <>
                        <nav className="navbar">
                            <div className="nav-brand">تواصل</div>
                            <div className="nav-links">
                                <a href="/feed">الرئيسية</a>
                                <a href="/friends">الأصدقاء</a>
                                <a href="/chat">المحادثات</a>
                                <a href={`/profile/${user.id}`}>ملفي</a>
                                <button onClick={handleLogout}>خروج</button>
                            </div>
                        </nav>
                        <Routes>
                            <Route path="/feed" element={<Feed api={api} user={user} />} />
                            <Route path="/profile/:userId" element={<Profile api={api} user={user} />} />
                            <Route path="/friends" element={<Friends api={api} user={user} />} />
                            <Route path="/chat" element={<Chat api={api} user={user} />} />
                            <Route path="/chat/:conversationId" element={<Chat api={api} user={user} />} />
                            <Route path="/" element={<Navigate to="/feed" />} />
                        </Routes>
                    </>
                ) : (
                    <Routes>
                        <Route path="/login" element={<Login onLogin={handleLogin} />} />
                        <Route path="/register" element={<Register api={api} />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                )}
            </div>
        </Router>
    );
}

export default App;
