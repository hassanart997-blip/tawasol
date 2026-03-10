// App.js - نسخة كاملة ومطوّرة بملف واحد
import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api'; // تأكد ان api.js موجود
import Login from './components/Login';
import Register from './components/Register';
import Profile from './components/Profile';
import Chat from './components/Chat';
import Friends from './components/Friends';
import io from 'socket.io-client';

// ====== Context ======
const AppContext = createContext();
export function AppProvider({ children, user }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [reels, setReels] = useState([]);
  const [explorePosts, setExplorePosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const fileRef = useRef();
  const socketRef = useRef(null);

  // Socket
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', user.id);

    socket.on('receiveMessage', msg => alert(`رسالة جديدة من ${msg.senderId}`));
    socket.on('newLike', data => alert(`${data.user} أعجب بمنشورك!`));
    socket.on('newPost', post => setPosts(prev => [post, ...prev]));

    return () => socket.disconnect();
  }, [user.id]);

  // Load posts
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`/posts?page=${page}`);
        setPosts(prev => [...prev, ...res.data]);
        if(res.data.length === 0) setHasMore(false);
      } catch(e){ console.error(e); }
    };
    load();
  }, [page]);

  // Search users
  useEffect(() => {
    if(!searchQuery.trim()) return setSearchResults([]);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/posts/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch(e){ console.error(e); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <AppContext.Provider value={{
      api, user,
      posts, setPosts,
      stories, setStories,
      reels, setReels,
      explorePosts, setExplorePosts,
      notifications, setNotifications,
      fileRef,
      searchQuery, setSearchQuery,
      searchResults,
      hasMore, setPage
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}

// ====== Feed Component ======
function Feed() {
  const {
    api, user, posts, setPosts,
    fileRef, searchQuery, setSearchQuery, searchResults,
    hasMore, setPage
  } = useApp();

  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  const firstLetter = name => name ? name.charAt(0).toUpperCase() : '؟';
  const timeAgo = date => {
    const diff = Math.floor((new Date() - new Date(date)) / 1000);
    if(diff<60) return 'الآن';
    if(diff<3600) return `${Math.floor(diff/60)} دقيقة`;
    if(diff<86400) return `${Math.floor(diff/3600)} ساعة`;
    return `${Math.floor(diff/86400)} يوم`;
  };

  const handleMedia = e => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.type.startsWith('video/')) setVideo(file);
    else setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const uploadFile = async file => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/posts/upload', formData, { headers:{ 'Content-Type':'multipart/form-data' } });
    return res.data.url;
  };

  const addPost = async () => {
    if(!content.trim() && !image && !video) return;
    setLoading(true);
    try {
      let image_url=null, video_url=null;
      if(image) image_url = await uploadFile(image);
      if(video) video_url = await uploadFile(video);
      const res = await api.post('/posts', { content, image_url, video_url });
      setPosts([res.data, ...posts]);
      setContent(''); setImage(null); setVideo(null); setPreview(null);
    } catch(e){ console.error(e); }
    setLoading(false);
  };

  const likePost = async id => {
    try {
      const res = await api.post(`/posts/${id}/like`);
      setPosts(prev => prev.map(p => p.id===id ? {...p, liked: res.data.liked} : p));
    } catch(e){ console.error(e); }
  };

  return (
    <div className="feed-container">
      <input type="text" placeholder="ابحث عن مستخدمين..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} />
      {searchResults.length>0 && <div className="search-results">{searchResults.map(u=>(
        <div key={u.id}><strong>{u.full_name}</strong> @{u.username}</div>
      ))}</div>}

      <div className="create-post">
        <textarea placeholder="شارك ما يدور في ذهنك..." value={content} onChange={e=>setContent(e.target.value)} />
        {preview && <div className="preview"><img src={preview} alt="preview"/><button onClick={()=>{setImage(null); setVideo(null); setPreview(null)}}>✕</button></div>}
        <input type="file" ref={fileRef} onChange={handleMedia} style={{display:'none'}} />
        <button onClick={()=>fileRef.current.click()}>📷 / 🎥</button>
        <button onClick={addPost} disabled={loading}>{loading?'جاري النشر...':'نشر'}</button>
      </div>

      {posts.map(post=>(
        <div key={post.id} className="post-card">
          <div><strong>{post.full_name}</strong> - {timeAgo(post.created_at)}</div>
          <div>{post.content}</div>
          {post.image_url && <img src={post.image_url} alt="post"/>}
          {post.video_url && <video src={post.video_url} controls />}
          <button onClick={()=>likePost(post.id)}>{post.liked?'❤️':'🤍'} إعجاب</button>
        </div>
      ))}

      {hasMore && <button onClick={()=>setPage(prev=>prev+1)}>تحميل المزيد</button>}
    </div>
  );
}

// ====== App Main ======
function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if(token){
      api.get('/profile')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if(loading) return <div style={{textAlign:'center',marginTop:'50px'}}>جاري التحميل...</div>;

  return (
    <Router>
      {user ? (
        <AppProvider user={user}>
          <nav style={{padding:'10px',background:'#fff',borderBottom:'1px solid #ddd',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <strong>تواصل</strong>
            <div style={{display:'flex',gap:'15px'}}>
              <a href="/feed">🏠</a>
              <a href="/friends">👥</a>
              <a href="/chat">💬</a>
              <a href={`/profile/${user.id}`}>👤</a>
              <button onClick={handleLogout}>خروج</button>
            </div>
          </nav>
          <Routes>
            <Route path="/feed" element={<Feed />} />
            <Route path="/profile/:userId" element={<Profile />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/" element={<Navigate to="/feed" />} />
          </Routes>
        </AppProvider>
      ) : (
        <Routes>
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;
