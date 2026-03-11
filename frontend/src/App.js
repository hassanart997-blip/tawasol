import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';

const AppContext = createContext();
export function useApp() { return useContext(AppContext); }

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

const MoreIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="#000">
    <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
  </svg>
);

// ===== Feed =====
function Feed() {
  const { user, posts, setPosts } = useApp();
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [saved, setSaved] = useState({});
  const [activeTab, setActiveTab] = useState('home');
  const fileRef = useRef();

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if(diff<60) return 'الآن';
    if(diff<3600) return `${Math.floor(diff/60)} دقيقة`;
    if(diff<86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  useEffect(() => {
    api.get('/posts').then(r => setPosts(r.data)).catch(console.error);
  }, []);

  const handleMedia = e => {
    const file = e.target.files[0];
    if(!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const addPost = async () => {
    if(!content.trim() && !image) return;
    setLoading(true);
    try {
      let image_url = null;
      if(image) {
        const fd = new FormData();
        fd.append('file', image);
        const r = await api.post('/posts/upload', fd, { headers:{'Content-Type':'multipart/form-data'} });
        image_url = r.data.url;
      }
      const res = await api.post('/posts', { content, image_url });
      setPosts(prev => [res.data, ...prev]);
      setContent(''); setImage(null); setPreview(null); setShowModal(false);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const likePost = async id => {
    try {
      const res = await api.post(`/posts/${id}/like`);
      setPosts(prev => prev.map(p => p.id===id ? {...p, liked: res.data.liked, likes_count: Number(p.likes_count) + (res.data.liked?1:-1)} : p));
    } catch(e){ console.error(e); }
  };

  const toggleSave = id => setSaved(prev => ({...prev, [id]: !prev[id]}));

  return (
    <div>
      {showModal && (
        <div className="post-modal-overlay" onClick={e => e.target===e.currentTarget && setShowModal(false)}>
          <div className="post-modal">
            <h3>منشور جديد</h3>
            <textarea rows="4" placeholder="شارك ما يدور في ذهنك..." value={content} onChange={e=>setContent(e.target.value)} />
            {preview && <img src={preview} alt="preview" className="preview-img" />}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={()=>setShowModal(false)}>إلغاء</button>
              <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                <input type="file" ref={fileRef} onChange={handleMedia} style={{display:'none'}} accept="image/*,video/*" />
                <button style={{background:'none',color:'#8e8e8e',border:'none',fontSize:'22px',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                </button>
                <button onClick={addPost} disabled={loading}>{loading?'جاري...':'نشر'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{paddingTop:'60px',paddingBottom:'60px'}}>
        {posts.map(post => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <div className="post-avatar">
                <div className="post-avatar-inner">{firstLetter(post.full_name)}</div>
              </div>
              <div className="post-user-info">
                <div className="post-username">{post.username}</div>
                <div className="post-time">{timeAgo(post.created_at)}</div>
              </div>
              <button className="post-more"><MoreIcon/></button>
            </div>
            {post.image_url && <img src={post.image_url} alt="post" className="post-image" />}
            {post.video_url && <video src={post.video_url} controls className="post-video" />}
            <div className="post-actions">
              <button className={post.liked?'liked':''} onClick={()=>likePost(post.id)}>
                <HeartIcon filled={post.liked}/>
              </button>
              <button><CommentIcon/></button>
              <button><ShareIcon/></button>
              <button className="save-btn" onClick={()=>toggleSave(post.id)}>
                <BookmarkIcon filled={saved[post.id]}/>
              </button>
            </div>
            {Number(post.likes_count)>0 && <div className="post-likes">{post.likes_count} إعجاب</div>}
            {post.content && <div className="post-caption"><strong>{post.username}</strong> {post.content}</div>}
            <div className="post-comment-hint">أضف تعليقاً...</div>
          </div>
        ))}
      </div>

      <div className="bottom-nav">
        <a href="/feed" onClick={()=>setActiveTab('home')}><HomeIcon filled={activeTab==='home'}/></a>
        <a href="/friends" onClick={()=>setActiveTab('search')}><SearchIcon/></a>
        <button className="add-post-btn" onClick={()=>setShowModal(true)}><PlusIcon/></button>
        <a href="/chat" onClick={()=>setActiveTab('chat')}><ChatIcon filled={activeTab==='chat'}/></a>
        <a href={`/profile/${user?.id}`} onClick={()=>setActiveTab('profile')}><UserIcon filled={activeTab==='profile'}/></a>
      </div>
    </div>
  );
}

// ===== App Main =====
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if(token){
      api.get('/profile').then(r => setUser(r.data)).catch(()=>localStorage.removeItem('token')).finally(()=>setLoading(false));
    } else setLoading(false);
  }, []);

  const handleLogin = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return { success:true };
    } catch(e){ return { success:false, error:e.response?.data?.message||'خطأ' }; }
  };

  if(loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <AppContext.Provider value={{ user, posts, setPosts }}>
      <Router>
        {user ? (
          <>
            <nav>
              <strong>تواصل</strong>
              <div className="nav-icons">
                <span style={{cursor:'pointer'}}>
                  <HeartIcon/>
                </span>
                <span style={{cursor:'pointer'}} onClick={()=>{localStorage.removeItem('token');window.location.reload();}}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                    <polyline points="16,17 21,12 16,7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                  </svg>
                </span>
              </div>
            </nav>
            <Routes>
              <Route path="/feed" element={<Feed />} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/" element={<Navigate to="/feed" />} />
            </Routes>
          </>
        ) : (
          <Routes>
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </Routes>
        )}
      </Router>
    </AppContext.Provider>
  );
}

export default App;
