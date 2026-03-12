// ===== App Main =====
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if(token){
      api.get('/profile')
        .then(r => setUser(r.data))
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // جلب عدد الإشعارات غير المقروءة كل دقيقة
  useEffect(() => {
    if(!user) return;
    const fetchUnread = () => {
      api.get('/notifications/unread').then(r => setUnreadCount(r.data.count)).catch(console.error);
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch(e){
      return { success: false, error: e.response?.data?.message || 'خطأ' };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if(loading) {
    return (
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, posts, setPosts }}>
      <Router>
        {user ? (
          <>
            <nav>
              <strong>تواصل</strong>
              <div className="nav-icons">
                {/* جرس الإشعارات */}
                <span style={{cursor:'pointer',position:'relative'}} onClick={()=>{setShowNotifications(true);setUnreadCount(0);}}>
                  <BellIcon/>
                  {unreadCount > 0 && (
                    <span style={{
                      position:'absolute',top:'-4px',right:'-4px',
                      background:'#ed4956',color:'#fff',
                      borderRadius:'50%',width:'16px',height:'16px',
                      fontSize:'10px',display:'flex',alignItems:'center',justifyContent:'center',
                      fontWeight:'700'
                    }}>{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </span>
                {/* تسجيل خروج */}
                <span style={{cursor:'pointer'}} onClick={handleLogout}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </span>
              </div>
            </nav>

            {showNotifications && <Notifications onClose={()=>setShowNotifications(false)} />}

            <Routes>
              <Route path="/feed" element={<Feed />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/" element={<Navigate to="/feed" replace />} />
              <Route path="*" element={<Navigate to="/feed" replace />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        )}
      </Router>
    </AppContext.Provider>
  );
}
