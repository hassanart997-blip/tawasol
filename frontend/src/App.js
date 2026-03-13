// App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';
import Notifications from './components/Notifications';
import Feed from './components/Feed';

// ===== Icons =====
const HomeIcon = ({filled}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled?"#000":"none"} stroke="#000" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
    <polyline points="9,22 9,12 15,12 15,22"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const HeartIcon = ({filled}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled?"#ed4956":"none"} stroke={filled?"#ed4956":"#000"} strokeWidth="2">
    <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
  </svg>
);
const CommentIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const ShareIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9"/>
  </svg>
);
const BookmarkIcon = ({filled}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled?"#000":"none"} stroke="#000" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
  </svg>
);
const ChatIcon = ({filled}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled?"#000":"none"} stroke="#000" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
  </svg>
);
const UserIcon = ({filled}) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill={filled?"#000":"none"} stroke="#000" strokeWidth="2">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
    <circle cx="12" cy="7" r="4"/>
  </svg>
);
const BellIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);

// ===== AppContent =====
function AppContent() {
  const { user, logout, loading, unreadNotificationsCount } = useApp();
  const [showNotifications, setShowNotifications] = React.useState(false);

  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;

  return (
    <Router>
      {user ? (
        <>
          <nav>
            <strong>تواصل</strong>
            <div className="nav-icons">
              <span style={{cursor:'pointer',position:'relative'}} onClick={()=>setShowNotifications(true)}>
                <BellIcon/>
                {unreadNotificationsCount>0 && (
                  <span style={{position:'absolute',top:'-4px',right:'-4px',background:'#ed4956',color:'#fff',borderRadius:'50%',width:'16px',height:'16px',fontSize:'10px',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:'700'}}>
                    {unreadNotificationsCount>9?'9+':unreadNotificationsCount}
                  </span>
                )}
              </span>
              <span style={{cursor:'pointer'}} onClick={logout}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
              </span>
            </div>
          </nav>
          {showNotifications && <Notifications onClose={()=>setShowNotifications(false)}/>}
          <Routes>
            <Route path="/feed" element={<Feed/>}/>
            <Route path="/profile/:userId" element={<Profile/>}/>
            <Route path="/friends" element={<Friends/>}/>
            <Route path="/chat" element={<Chat/>}/>
            <Route path="/" element={<Navigate to="/feed" replace/>}/>
            <Route path="*" element={<Navigate to="/feed" replace/>}/>
          </Routes>
        </>
      ) : (
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/register" element={<Register/>}/>
          <Route path="*" element={<Navigate to="/login" replace/>}/>
        </Routes>
      )}
    </Router>
  );
}

// ===== App =====
export default function App() {
  return (
    <AppProvider>
      <AppContent/>
    </AppProvider>
  );
}
