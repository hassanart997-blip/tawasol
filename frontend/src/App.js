function AppContent() {
  const { user, logout, loading } = useApp(); // ✅ removed unreadNotificationsCount
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
                {/* إذا أردت عداد الإشعارات مستقبلاً، أضفه من AppContext */}
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
