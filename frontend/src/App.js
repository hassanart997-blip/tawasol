import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';
import './App.css';

const api = axios.create({
    baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
    withCredentials: true
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
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            api.get('/auth/verify')
                .then(response => {
                    setUser(response.data.user);
                    connectSocket(response.data.user, token);
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, []);

    const connectSocket = (user, token) => {
        const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
        const newSocket = io(socketUrl, { auth: { token } });
        newSocket.on('connect', () => console.log('متصل بالخادم'));
        newSocket.on('new_message', (message) => {
            window.dispatchEvent(new CustomEvent('new_message', { detail: message }));
        });
        newSocket.on('user_typing', (data) => {
            window.dispatchEvent(new CustomEvent('user_typing', { detail: data }));
        });
        setSocket(newSocket);
    };

    const handleLogin = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, user } = response.data;
            localStorage.setItem('token', token);
            setUser(user);
            connectSocket(user, token);
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
        if (socket) socket.disconnect();
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
                            <Route path="/profile/:userId" element={<Profile api={api} user={user} socket={socket} />} />
                            <Route path="/friends" element={<Friends api={api} user={user} />} />
                            <Route path="/chat" element={<Chat api={api} user={user} socket={socket} />} />
                            <Route path="/chat/:conversationId" element={<Chat api={api} user={user} socket={socket} />} />
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
