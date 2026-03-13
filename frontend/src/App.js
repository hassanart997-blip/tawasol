import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import api from './api';
import './App.css';
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';
import Notifications from './components/Notifications';

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

// ===== Feed =====
function Feed() {
  const { user, posts, setPosts, addPost, removePost, updatePost, notifySuccess, notifyError } = useApp();
  const [content, setContent] = React.useState('');
  const [preview, setPreview] = React.useState(null);
  const [image, setImage] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [showModal, setShowModal] = React.useState(false);
  const [saved, setSaved] = React.useState({});
  const [activeTab, setActiveTab] = React.useState('home');
  const [menuOpen, setMenuOpen] = React.useState(null);
  const [editPost, setEditPost] = React.useState(null);
  const [editContent, setEditContent] = React.useState('');
  const fileRef = React.useRef();

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if(diff<60) return 'الآن';
    if(diff<3600) return `${Math.floor(diff/60)} دقيقة`;
    if(diff<86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  React.useEffect(() => {
    api.get('/posts').then(r => setPosts(r.data)).catch(() => notifyError('فشل تحميل المنشورات'));
  }, []);

  React.useEffect(() => {
    const close = () => setMenuOpen(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const handleMedia = e => {
    const file = e.target.files[0];
    if(!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const addPostHandler = async () => {
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
      addPost(res.data);
      setContent(''); setImage(null); setPreview(null); setShowModal(false);
      notifySuccess('تم نشر المنشور بنجاح');
    } catch(e) { notifyError('فشل النشر'); }
    setLoading(false);
  };

  const likePost = async id => {
    try {
      const res = await api.post(`/posts/${id}/like`);
      updatePost(id, { liked: res.data.liked, likes_count: (posts.find(p=>p.id===id)?.likes_count||0) + (res.data.liked?1:-1) });
    } catch(e) { notifyError('فشل الإعجاب'); }
  };

  const deletePost = async id => {
    if(!window.confirm('هل تريد حذف المنشور؟')) return;
    try {
      await api.delete(`/posts/${id}`);
      removePost(id);
      notifySuccess('تم الحذف');
    } catch(e) { notifyError('فشل الحذف'); }
    setMenuOpen(null);
  };

  const startEdit = post => { setEditPost(post.id); setEditContent(post.content||''); setMenuOpen(null); };
  const saveEdit = async id => {
    try {
      const res = await api.put(`/posts/${id}`, { content: editContent });
      updatePost(id, { content: res.data.content });
      setEditPost(null);
      notifySuccess('تم التعديل');
    } catch(e) { notifyError('فشل التعديل'); }
  };

  const toggleSave = id => setSaved(prev => ({...prev, [id]: !prev[id]}));

  if(!user) return <div className="loading-spinner"><div className="spinner"/></div>;

  return (
    <div>
      {showModal && (
        <div className="post-modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowModal(false)}>
          <div className="post-modal">
            <h3>منشور جديد</h3>
            <textarea rows="4" placeholder="شارك ما يدور في ذهنك..." value={content} onChange={e=>setContent(e.target.value)}/>
            {preview && <img src={preview} alt="preview" className="preview-img"/>}
            <div className="modal-actions">
              <button className="cancel-btn" onClick={()=>setShowModal(false)}>إلغاء</button>
              <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                <input type="file" ref={fileRef} onChange={handleMedia} style={{display:'none'}} accept="image/*,video/*"/>
                <button style={{background:'none',color:'#8e8e8e',border:'none',fontSize:'22px',cursor:'pointer'}} onClick={()=>fileRef.current.click()}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8e8e8e" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                </button>
                <button onClick={addPostHandler} disabled={loading}>{loading?'جاري...':'نشر'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{paddingTop:'60px',paddingBottom:'60px'}}>
        {posts.length===0 ? (
          <p style={{textAlign:'center',color:'#8e8e8e',padding:'40px'}}>لا توجد منشورات بعد</p>
        ) : posts.map(post => (
          <div key={post.id} className="post-card">
            <div className="post-header">
              <Link to={`/profile/${post.user_id}`} style={{display:'flex',alignItems:'center',gap:'10px',textDecoration:'none',color:'inherit',flex:1}}>
                <div className="post-avatar"><div className="post-avatar-inner">{post.full_name?firstLetter(post.full_name):'؟'}</div></div>
                <div className="post-user-info">
                  <div className="post-username">{post.username}</div>
                  <div className="post-time">{timeAgo(post.created_at)}</div>
                </div>
              </Link>
              {post.user_id===user?.id && (
                <div style={{position:'relative'}}>
                  <button className="post-more" onClick={e=>{e.stopPropagation();setMenuOpen(menuOpen===post.id?null:post.id);}}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#000">
                      <circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>
                    </svg>
                  </button>
                  {menuOpen===post.id && (
                    <div style={{position:'absolute',right:0,top:'30px',background:'#fff',borderRadius:'12px',boxShadow:'0 4px 20px rgba(0,0,0,0.15)',zIndex:100,minWidth:'140px',overflow:'hidden'}}>
                      <button onClick={e=>{e.stopPropagation();startEdit(post);}} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'right',cursor:'pointer',fontSize:'14px',color:'#262626'}}>✏️ تعديل</button>
                      <button onClick={e=>{e.stopPropagation();deletePost(post.id);}} style={{display:'block',width:'100%',padding:'12px 16px',border:'none',background:'none',textAlign:'right',cursor:'pointer',fontSize:'14px',color:'#ed4956'}}>🗑️ حذف</button>
                    </div>
                  )}
                </div>
              )}
            </div>
            {post.image_url && <img src={post.image_url} alt="post" className="post-image"/>}
            {post.video_url && <video src={post.video_url} controls className="post-video"/>}
            <div className="post-actions">
              <button className={post.liked?'liked':''} onClick={()=>likePost(post.id)}><HeartIcon filled={post.liked}/></button>
              <button><CommentIcon/></button>
              <button><ShareIcon/></button>
              <button className="save-btn" onClick={()=>toggleSave(post.id)}><BookmarkIcon filled={saved[post.id]}/></button>
            </div>
            {Number(post.likes_count)>0 && <div className="post-likes">{post.likes_count} إعجاب</div>}
            {editPost===post.id ? (
              <div style={{padding:'0 12px 12px',display:'flex',gap:'8px'}}>
                <input value={editContent} onChange={e=>setEditContent(e.target.value)} style={{flex:1,border:'1px solid #dbdbdb',borderRadius:'8px',padding:'8px',fontSize:'14px',direction:'rtl'}}/>
                <button onClick={()=>saveEdit(post.id)} style={{background:'#0095f6',color:'#fff',border:'none',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',fontSize:'13px'}}>حفظ</button>
                <button onClick={()=>setEditPost(null)} style={{background:'#efefef',border:'none',borderRadius:'8px',padding:'8px 12px',cursor:'pointer',fontSize:'13px'}}>إلغاء</button>
              </div>
            ) : (
              post.content && <div className="post-caption"><strong>{post.username}</strong> {post.content}</div>
            )}
            <div className="post-comment-hint">أضف تعليقاً...</div>
          </div>
        ))}
      </div>

      <div className="bottom-nav">
        <Link to="/feed" onClick={()=>setActiveTab('home')}><HomeIcon filled={activeTab==='home'}/></Link>
        <Link to="/friends" onClick={()=>setActiveTab('search')}><SearchIcon/></Link>
        <button className="add-post-btn" onClick={()=>setShowModal(true)}><PlusIcon/></button>
        <Link to="/chat" onClick={()=>setActiveTab('chat')}><ChatIcon filled={activeTab==='chat'}/></Link>
        <Link to={`/profile/${user?.id}`} onClick={()=>setActiveTab('profile')}><UserIcon filled={activeTab==='profile'}/></Link>
      </div>
    </div>
  );
}

// ===== AppContent =====
function AppContent() {
  const { user, login, logout, setLoading, unreadNotificationsCount } = useApp();
  const [appLoading, setAppLoading] = React.useState(true);
  const [showNotifications, setShowNotifications] = React.useState(false);

  // تحميل المستخدم من التوكن عند بدء التشغيل
  React.useEffect(() => {
    const token = localStorage.getItem('token');
    if(token) {
      api.get('/profile')
        .then(r => login(r.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setAppLoading(false));
    } else {
      setAppLoading(false);
    }
  }, []);

  if(appLoading) return <div className="loading-spinner"><div className="spinner"></div></div>;

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

export default function App() {
  return (
    <AppProvider>
      <AppContent/>
    </AppProvider>
  );
}
