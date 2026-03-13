// src/context/AppContext.js
import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import api from '../api';
import io from 'socket.io-client';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [reels, setReels] = useState([]);
  const [explorePosts, setExplorePosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('settings');
    return saved ? JSON.parse(saved) : { language: 'ar', notifications: true, sound: true };
  });

  const socketRef = useRef(null);
  const fileRef = useRef();

  // ===== تحميل المستخدم عند mount مرة واحدة فقط =====
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    api.get('/profile')
      .then(res => {
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      })
      .finally(() => setLoading(false));
  }, []); // ❌ لا نضع user أو token كـ dependency لتجنب loop

  // ===== حفظ theme و settings تلقائيًا =====
  useEffect(() => {
    localStorage.setItem('theme', theme);
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [theme, settings]);

  // ===== WebSocket مع إعادة الاتصال =====
  useEffect(() => {
    if (!user) return;

    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    socket.emit('join', user.id);

    socket.on('receiveMessage', msg => {
      if (settings.notifications) toast.info(`رسالة جديدة من ${msg.senderName}`, { autoClose: 3000 });
    });

    socket.on('newLike', data => {
      if (settings.notifications) toast.success(`${data.user} أعجب بمنشورك!`, { autoClose: 3000 });
    });

    socket.on('newPost', post => {
      setPosts(prev => [post, ...prev]);
      if (settings.notifications && post.user_id !== user.id)
        toast.info(`منشور جديد من ${post.username}`, { autoClose: 3000 });
    });

    socket.on('newNotification', n => setNotifications(prev => [n, ...prev]));

    return () => socket.disconnect();
  }, [user, settings.notifications]);

  // ===== تحميل المنشورات مع pagination =====
  const loadMorePosts = useCallback(async () => {
    if (!hasMore || !user) return;
    try {
      const res = await api.get(`/posts?page=${page}`);
      if (!res.data.length) setHasMore(false);
      else setPosts(prev => [...prev, ...res.data]);
    } catch (e) {
      console.error('خطأ في تحميل المنشورات:', e);
    }
  }, [page, hasMore, user]);

  // ===== رفع الملفات =====
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/posts/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  }, []);

  // ===== إضافة منشور =====
  const addPost = useCallback(async ({ content, image, video }) => {
    if (!content?.trim() && !image && !video) return null;
    try {
      const image_url = image ? await uploadFile(image) : null;
      const video_url = video ? await uploadFile(video) : null;
      const res = await api.post('/posts', { content, image_url, video_url });
      setPosts(prev => [res.data, ...prev]);
      socketRef.current?.emit('newPost', res.data);
      toast.success('تم نشر المنشور بنجاح');
      return res.data;
    } catch (e) {
      console.error('خطأ في إضافة المنشور:', e);
      toast.error('فشل نشر المنشور');
      return null;
    }
  }, [uploadFile]);

  // ===== إعجاب المنشورات =====
  const likePost = useCallback(async (postId) => {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, liked: res.data.liked, likes_count: (p.likes_count || 0) + (res.data.liked ? 1 : -1) }
            : p
        )
      );
    } catch (e) { console.error('خطأ في الإعجاب:', e); }
  }, []);

  // ===== البحث مع debounce =====
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/search?q=${searchQuery}`);
        setSearchResults(res.data);
      } catch (e) {
        console.error('خطأ في البحث:', e);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ===== تسجيل الدخول =====
  const login = useCallback(async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      setUser(res.data.user);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success('تم تسجيل الدخول بنجاح');
      return { success: true };
    } catch (e) {
      const msg = e.response?.data?.message || 'فشل تسجيل الدخول';
      toast.error(msg);
      return { success: false, error: msg };
    }
  }, []);

  // ===== تسجيل الخروج =====
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setPosts([]);
    setStories([]);
    setReels([]);
    setExplorePosts([]);
    setNotifications([]);
    delete api.defaults.headers.common['Authorization'];
    socketRef.current?.disconnect();
    socketRef.current = null;
    toast.info('تم تسجيل الخروج');
  }, []);

  // ===== Theme & Settings =====
  const toggleTheme = useCallback(() => setTheme(prev => (prev === 'light' ? 'dark' : 'light')), []);
  const updateSettings = useCallback(s => setSettings(prev => ({ ...prev, ...s })), []);

  return (
    <AppContext.Provider
      value={{
        user, posts, stories, reels, explorePosts, notifications,
        searchQuery, searchResults, page, hasMore, loading, theme, settings,
        fileRef, socketRef,
        setPosts, setStories, setReels, setExplorePosts, setSearchQuery, setPage, setHasMore,
        loadMorePosts, addPost, likePost, uploadFile, login, logout, toggleTheme, updateSettings,
      }}
    >
      {children}
      <ToastContainer
        position="top-left"
        autoClose={4000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={theme === 'dark' ? 'dark' : 'light'}
      />
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
