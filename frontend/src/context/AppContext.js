import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import api from '../api';
import io from 'socket.io-client';

const AppContext = createContext();

export function AppProvider({ children, user }) {
  const [posts, setPosts] = useState([]);
  const [stories, setStories] = useState([]);
  const [reels, setReels] = useState([]);
  const [explorePosts, setExplorePosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const socketRef = useRef(null);
  const fileRef = useRef();

  useEffect(() => {
    if (!user) return;
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');
    socketRef.current = socket;
    socket.emit('join', user.id);
    socket.on('receiveMessage', msg => alert(`رسالة جديدة من ${msg.senderId}`));
    socket.on('newLike', data => alert(`${data.user} أعجب بمنشورك!`));
    socket.on('newPost', post => setPosts(prev => [post, ...prev]));
    return () => socket.disconnect();
  }, [user]);

  const loadMorePosts = async () => {
    if (!hasMore) return;
    try {
      const res = await api.get(`/posts?page=${page}`);
      if (res.data.length === 0) setHasMore(false);
      else setPosts(prev => [...prev, ...res.data]);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { loadMorePosts(); }, [page]);

  const uploadFile = async file => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post('/posts/upload', formData, { headers: { 'Content-Type':'multipart/form-data' } });
    return res.data.url;
  };

  const addPost = async ({ content, image, video }) => {
    if (!content?.trim() && !image && !video) return null;
    try {
      let image_url = null, video_url = null;
      if (image) image_url = await uploadFile(image);
      if (video) video_url = await uploadFile(video);
      const res = await api.post('/posts', { content, image_url, video_url });
      setPosts(prev => [res.data, ...prev]);
      socketRef.current?.emit('newPost', res.data);
      return res.data;
    } catch (e) { console.error(e); return null; }
  };

  const likePost = async (postId) => {
    try {
      const res = await api.post(`/posts/${postId}/like`);
      loadMorePosts();
      if (res.data.liked) socketRef.current?.emit('newLike', { user: user.full_name, postId });
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    if (!searchQuery.trim()) return setSearchResults([]);
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
      searchQuery, setSearchQuery,
      searchResults,
      fileRef, socketRef,
      page, setPage, hasMore,
      addPost, likePost, loadMorePosts
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
      }
