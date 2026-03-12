import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import api from './api';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';

const AppContext = createContext();
export function useApp() { return useContext(AppContext); }

// ===== Icons Component =====
const Icons = {
  Home: ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#000" : "none"} stroke="#000" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
  Search: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Plus: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Heart: ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#ed4956" : "none"} stroke={filled ? "#ed4956" : "#000"} strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  Comment: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  Share: () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22,2 15,22 11,13 2,9" />
    </svg>
  ),
  Bookmark: ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#000" : "none"} stroke="#000" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
    </svg>
  ),
  Chat: ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#000" : "none"} stroke="#000" strokeWidth="2">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  ),
  User: ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? "#000" : "none"} stroke="#000" strokeWidth="2">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  More: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
      <circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" />
    </svg>
  ),
  Logout: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
};

// ===== Post Card Component =====
function PostCard({ post, onLike, onDelete, onEdit, onSave, isSaved, isOwner }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState(post.content || '');
  const menuRef = useRef();

  const timeAgo = (date) => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if (diff < 60) return 'الآن';
    if (diff < 3600) return `${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} ساعة`;
    return `${Math.floor(diff / 86400)} يوم`;
  };

  const firstLetter = (name) => name ? name.charAt(0).toUpperCase() : '؟';

  const handleSaveEdit = () => {
    onEdit(post.id, editContent);
    setEditMode(false);
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-avatar">
          <div className="post-avatar-inner">{firstLetter(post.full_name)}</div>
        </div>
        <div className="post-user-info">
          <Link to={`/profile/${post.user_id}`} className="post-username">{post.username}</Link>
          <div className="post-time">{timeAgo(post.created_at)}</div>
        </div>

        {isOwner && (
          <div className="post-menu" ref={menuRef}>
            <button className="post-more" onClick={() => setMenuOpen(!menuOpen)}>
              <Icons.More />
            </button>
            {menuOpen && (
              <div className="post-menu-dropdown">
                <button onClick={() => { setEditMode(true); setMenuOpen(false); }}>
                  ✏️ تعديل
                </button>
                <button onClick={() => { onDelete(post.id); setMenuOpen(false); }} className="delete">
                  🗑️ حذف
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {post.image_url && <img src={post.image_url} alt="post" className="post-image" loading="lazy" />}
      {post.video_url && <video src={post.video_url} controls className="post-video" />}

      <div className="post-actions">
        <button className={post.liked ? 'liked' : ''} onClick={() => onLike(post.id)}>
          <Icons.Heart filled={post.liked} />
        </button>
        <button><Icons.Comment /></button>
        <button><Icons.Share /></button>
        <button className="save-btn" onClick={() => onSave(post.id)}>
          <Icons.Bookmark filled={isSaved} />
        </button>
      </div>

      {Number(post.likes_count) > 0 && (
        <div className="post-likes">{post.likes_count} إعجاب</div>
      )}

      {editMode ? (
        <div className="edit-post-form">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="عدل المنشور..."
            rows="3"
          />
          <div className="edit-actions">
            <button onClick={handleSaveEdit} className="save">حفظ</button>
            <button onClick={() => setEditMode(false)} className="cancel">إلغاء</button>
          </div>
        </div>
      ) : (
        post.content && (
          <div className="post-caption">
            <Link to={`/profile/${post.user_id}`} className="post-username-link">{post.username}</Link> {post.content}
          </div>
        )
      )}

      <div className="post-comment-hint">أضف تعليقاً...</div>
    </div>
  );
}

// ===== Create Post Modal =====
function CreatePostModal({ isOpen, onClose, onCreatePost }) {
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(null);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

  if (!isOpen) return null;

  const handleMedia = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!content.trim() && !image) return;
    setLoading(true);
    await onCreatePost(content, image);
    setContent('');
    setImage(null);
    setPreview(null);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <h3>منشور جديد</h3>
        <textarea
          rows="4"
          placeholder="شارك ما يدور في ذهنك..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {preview && <img src={preview} alt="preview" className="preview-img" />}
        <div className="modal-actions">
          <button className="cancel-btn" onClick={onClose}>إلغاء</button>
          <div className="modal-media-actions">
            <input
              type="file"
              ref={fileRef}
              onChange={handleMedia}
              accept="image/*,video/*"
              className="hidden-input"
            />
            <button className="media-btn" onClick={() => fileRef.current.click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21,15 16,10 5,21" />
              </svg>
            </button>
            <button onClick={handleSubmit} disabled={loading} className="submit-btn">
              {loading ? 'جاري...' : 'نشر'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Feed Component =====
function Feed() {
  const { user, posts, setPosts } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [saved, setSaved] = useState({});
  const [activeTab, setActiveTab] = useState('home');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/posts')
      .then(r => setPosts(r.data))
      .catch(err => console.error('Error loading posts:', err));
  }, [setPosts]);

  const handleCreatePost = async (content, image) => {
    try {
      let image_url = null;
      if (image) {
        const fd = new FormData();
        fd.append('file', image);
        const r = await api.post('/posts/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        image_url = r.data.url;
      }
      const res = await api.post('/posts', { content, image_url });
      setPosts(prev => [res.data, ...prev]);
    } catch (err) {
      console.error('Error creating post:', err);
    }
  };

  const handleLike = async (postId) => {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      setPosts(prev => prev.map(p =>
        p.id === postId
          ? { ...p, liked: res.data.liked, likes_count: Number(p.likes_count) + (res.data.liked ? 1 : -1) }
          : p
      ));
    } catch (err) {
      console.error('Error liking post:', err);
    }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm('هل أنت متأكد من حذف المنشور؟')) return;
    try {
      await api.delete(`/posts/${postId}`);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  };

  const handleEdit = async (postId, newContent) => {
    try {
      const res = await api.put(`/posts/${postId}`, { content: newContent });
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, content: res.data.content } : p));
    } catch (err) {
      console.error('Error editing post:', err);
    }
  };

  const toggleSave = (postId) => {
    setSaved(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  return (
    <div className="feed-container">
      <CreatePostModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onCreatePost={handleCreatePost}
      />

      <div className="posts-feed">
        {posts.map(post => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onDelete={handleDelete}
            onEdit={handleEdit}
            onSave={toggleSave}
            isSaved={saved[post.id]}
            isOwner={post.user_id === user?.id}
          />
        ))}
      </div>

      <nav className="bottom-nav">
        <button onClick={() => { setActiveTab('home'); navigate('/feed'); }} className={activeTab === 'home' ? 'active' : ''}>
          <Icons.Home filled={activeTab === 'home'} />
        </button>
        <button onClick={() => { setActiveTab('search'); navigate('/friends'); }} className={activeTab === 'search' ? 'active' : ''}>
          <Icons.Search />
        </button>
        <button className="add-post-btn" onClick={() => setShowModal(true)}>
          <Icons.Plus />
        </button>
        <button onClick={() => { setActiveTab('chat'); navigate('/chat'); }} className={activeTab === 'chat' ? 'active' : ''}>
          <Icons.Chat filled={activeTab === 'chat'} />
        </button>
        <button onClick={() => { setActiveTab('profile'); navigate(`/profile/${user?.id}`); }} className={activeTab === 'profile' ? 'active' : ''}>
          <Icons.User filled={activeTab === 'profile'} />
        </button>
      </nav>
    </div>
  );
}

// ===== Main App Component =====
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
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

  const handleLogin = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err.response?.data?.message || 'حدث خطأ في تسجيل الدخول'
      };
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={{ user, posts, setPosts }}>
      <Router>
        {user ? (
          <>
            <header className="top-nav">
              <h1 className="logo">تواصل</h1>
              <div className="nav-icons">
                <button className="icon-btn" onClick={handleLogout}>
                  <Icons.Logout />
                </button>
              </div>
            </header>
            <main className="main-content">
              <Routes>
                <Route path="/feed" element={<Feed />} />
                <Route path="/profile/:userId" element={<Profile />} />
                <Route path="/friends" element={<Friends />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/" element={<Navigate to="/feed" replace />} />
                <Route path="*" element={<Navigate to="/feed" replace />} />
              </Routes>
            </main>
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

export default App;
