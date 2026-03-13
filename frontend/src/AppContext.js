import React, { createContext, useContext, useReducer, useCallback, useEffect, useMemo } from 'react';
import api from '../api'; // تأكد عندك API جاهز

// ===== الحالة الأولية =====
const initialState = {
  user: JSON.parse(localStorage.getItem('user')) || null,
  posts: [],
  drafts: [],
  pinnedPosts: [],
  notifications: [],
  theme: localStorage.getItem('theme') || (new Date().getHours() >= 18 || new Date().getHours() < 6 ? 'dark' : 'light'),
  loading: false,
  settings: JSON.parse(localStorage.getItem('settings')) || {
    language: 'ar',
    notifications: true,
    sound: true,
    autoplay: false
  },
  offline: !navigator.onLine,
  history: { past: [], future: [] },
  searchQuery: ''
};

// ===== الإجراءات =====
const ACTIONS = {
  SET_USER: 'SET_USER',
  UPDATE_USER: 'UPDATE_USER',
  LOGOUT: 'LOGOUT',

  SET_POSTS: 'SET_POSTS',
  ADD_POST: 'ADD_POST',
  UPDATE_POST: 'UPDATE_POST',
  REMOVE_POST: 'REMOVE_POST',
  SET_DRAFTS: 'SET_DRAFTS',
  ADD_DRAFT: 'ADD_DRAFT',
  REMOVE_DRAFT: 'REMOVE_DRAFT',
  PIN_POST: 'PIN_POST',
  UNPIN_POST: 'UNPIN_POST',

  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',

  SET_THEME: 'SET_THEME',
  SET_LOADING: 'SET_LOADING',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',

  SET_OFFLINE: 'SET_OFFLINE',

  PUSH_HISTORY: 'PUSH_HISTORY',
  UNDO: 'UNDO',
  REDO: 'REDO',

  SET_SEARCH: 'SET_SEARCH',
  RESET: 'RESET'
};

// ===== Middleware للأخطاء =====
const errorMiddleware = reducer => (state, action) => {
  try {
    return reducer(state, action);
  } catch (error) {
    console.error('Reducer error:', error);
    return {
      ...state,
      notifications: [
        ...state.notifications,
        { id: Date.now(), message: 'حدث خطأ داخلي.', type: 'error', duration: 5000 }
      ]
    };
  }
};

// ===== Reducer =====
function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_USER:
      localStorage.setItem('user', JSON.stringify(action.payload));
      return { ...state, user: action.payload };

    case ACTIONS.UPDATE_USER:
      const updatedUser = { ...state.user, ...action.payload };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      return { ...state, user: updatedUser };

    case ACTIONS.LOGOUT:
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      return { ...state, user: null, posts: [], drafts: [], pinnedPosts: [] };

    case ACTIONS.SET_POSTS: return { ...state, posts: action.payload };
    case ACTIONS.ADD_POST: return { ...state, posts: [action.payload, ...state.posts] };
    case ACTIONS.UPDATE_POST:
      return { ...state, posts: state.posts.map(p => p.id === action.payload.id ? { ...p, ...action.payload.data } : p) };
    case ACTIONS.REMOVE_POST: return { ...state, posts: state.posts.filter(p => p.id !== action.payload) };

    case ACTIONS.SET_DRAFTS: return { ...state, drafts: action.payload };
    case ACTIONS.ADD_DRAFT: return { ...state, drafts: [action.payload, ...state.drafts] };
    case ACTIONS.REMOVE_DRAFT: return { ...state, drafts: state.drafts.filter(d => d.id !== action.payload) };

    case ACTIONS.PIN_POST:
      return { ...state, pinnedPosts: [action.payload, ...state.pinnedPosts] };
    case ACTIONS.UNPIN_POST:
      return { ...state, pinnedPosts: state.pinnedPosts.filter(p => p.id !== action.payload) };

    case ACTIONS.ADD_NOTIFICATION: return { ...state, notifications: [...state.notifications, action.payload] };
    case ACTIONS.REMOVE_NOTIFICATION: return { ...state, notifications: state.notifications.filter(n => n.id !== action.payload) };
    case ACTIONS.CLEAR_NOTIFICATIONS: return { ...state, notifications: [] };

    case ACTIONS.SET_THEME:
      localStorage.setItem('theme', action.payload);
      return { ...state, theme: action.payload };

    case ACTIONS.SET_LOADING: return { ...state, loading: action.payload };
    case ACTIONS.UPDATE_SETTINGS:
      const newSettings = { ...state.settings, ...action.payload };
      localStorage.setItem('settings', JSON.stringify(newSettings));
      return { ...state, settings: newSettings };

    case ACTIONS.SET_OFFLINE: return { ...state, offline: action.payload };

    case ACTIONS.PUSH_HISTORY:
      return { ...state, history: { past: [...state.history.past, action.payload], future: [] } };

    case ACTIONS.UNDO:
      if (!state.history.past.length) return state;
      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      return { ...previous, history: { past: newPast, future: [state, ...state.history.future] } };

    case ACTIONS.REDO:
      if (!state.history.future.length) return state;
      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      return { ...next, history: { past: [...state.history.past, state], future: newFuture } };

    case ACTIONS.SET_SEARCH: return { ...state, searchQuery: action.payload };
    case ACTIONS.RESET:
      localStorage.clear();
      return { ...initialState, user: null, theme: 'light', settings: initialState.settings };

    default: return state;
  }
}

const enhancedReducer = errorMiddleware(appReducer);
const AppContext = createContext();

// ===== Provider =====
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(enhancedReducer, initialState);

  // Online/Offline
  useEffect(() => {
    const handleOnline = () => dispatch({ type: ACTIONS.SET_OFFLINE, payload: false });
    const handleOffline = () => dispatch({ type: ACTIONS.SET_OFFLINE, payload: true });
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => { localStorage.setItem('settings', JSON.stringify(state.settings)); }, [state.settings]);

  // Auth
  const login = useCallback(userData => {
    dispatch({ type: ACTIONS.SET_USER, payload: userData });
    dispatch({ type: ACTIONS.ADD_NOTIFICATION, payload: { id: Date.now(), message: `مرحباً ${userData.full_name || userData.username}!`, type: 'success', duration: 3000 } });
  }, []);
  const logout = useCallback(() => dispatch({ type: ACTIONS.LOGOUT }), []);
  const updateUser = useCallback(data => dispatch({ type: ACTIONS.UPDATE_USER, payload: data }), []);
  const isAuthenticated = useMemo(() => !!state.user, [state.user]);

  // Posts
  const setPosts = useCallback(posts => dispatch({ type: ACTIONS.SET_POSTS, payload: posts }), []);
  const addPost = useCallback(post => dispatch({ type: ACTIONS.ADD_POST, payload: post }), []);
  const updatePost = useCallback((id, data) => dispatch({ type: ACTIONS.UPDATE_POST, payload: { id, data } }), []);
  const removePost = useCallback(id => dispatch({ type: ACTIONS.REMOVE_POST, payload: id }), []);
  const setDrafts = useCallback(drafts => dispatch({ type: ACTIONS.SET_DRAFTS, payload: drafts }), []);
  const addDraft = useCallback(draft => dispatch({ type: ACTIONS.ADD_DRAFT, payload: draft }), []);
  const removeDraft = useCallback(id => dispatch({ type: ACTIONS.REMOVE_DRAFT, payload: id }), []);
  const pinPost = useCallback(post => dispatch({ type: ACTIONS.PIN_POST, payload: post }), []);
  const unpinPost = useCallback(id => dispatch({ type: ACTIONS.UNPIN_POST, payload: id }), []);

  // Notifications
  const notify = useCallback(({ message, type = 'info', duration = 4000, dismissable = true }) => {
    const id = Date.now() + Math.random();
    dispatch({ type: ACTIONS.ADD_NOTIFICATION, payload: { id, message, type, dismissable, duration } });
    if (duration > 0) setTimeout(() => dispatch({ type: ACTIONS.REMOVE_NOTIFICATION, payload: id }), duration);
    return id;
  }, []);
  const notifySuccess = useCallback((msg, duration) => notify({ message: msg, type: 'success', duration }), [notify]);
  const notifyError = useCallback((msg, duration) => notify({ message: msg, type: 'error', duration }), [notify]);
  const notifyInfo = useCallback((msg, duration) => notify({ message: msg, type: 'info', duration }), [notify]);
  const removeNotification = useCallback(id => dispatch({ type: ACTIONS.REMOVE_NOTIFICATION, payload: id }), []);
  const clearNotifications = useCallback(() => dispatch({ type: ACTIONS.CLEAR_NOTIFICATIONS }), []);
  const unreadNotificationsCount = useMemo(() => state.notifications.filter(n => !n.read).length, [state.notifications]);

  // Theme
  const toggleTheme = useCallback(() => dispatch({ type: ACTIONS.SET_THEME, payload: state.theme === 'light' ? 'dark' : 'light' }), [state.theme]);

  // Loading
  const setLoading = useCallback(isLoading => dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading }), []);

  // Settings
  const updateSettings = useCallback(settings => dispatch({ type: ACTIONS.UPDATE_SETTINGS, payload: settings }), []);

  // API Helpers
  const fetchWithLoading = useCallback(async (asyncFn, loadingMessage = null) => {
    setLoading(true);
    if (loadingMessage) notifyInfo(loadingMessage, 2000);
    try { return await asyncFn(); }
    catch (error) { notifyError(error.response?.data?.message || error.message || 'حدث خطأ'); throw error; }
    finally { setLoading(false); }
  }, [setLoading, notifyInfo, notifyError]);

  const fetchPostsAPI = useCallback(async () => fetchWithLoading(async () => { const res = await api.get('/posts'); setPosts(res.data); return res.data; }, 'جاري تحميل المنشورات...'), [fetchWithLoading, setPosts]);
  const createPostAPI = useCallback(async (postData) => fetchWithLoading(async () => { const res = await api.post('/posts', postData); addPost(res.data); notifySuccess('تم نشر المنشور بنجاح'); return res.data; }, 'جاري النشر...'), [fetchWithLoading, addPost, notifySuccess]);

  // Search
  const setSearchQuery = useCallback(q => dispatch({ type: ACTIONS.SET_SEARCH, payload: q }), []);

  // History
  const pushHistory = useCallback(snapshot => dispatch({ type: ACTIONS.PUSH_HISTORY, payload: snapshot }), []);
  const undo = useCallback(() => dispatch({ type: ACTIONS.UNDO }), []);
  const redo = useCallback(() => dispatch({ type: ACTIONS.REDO }), []);
  const canUndo = state.history.past.length > 0;
  const canRedo = state.history.future.length > 0;

  // Reset App
  const resetApp = useCallback(() => { dispatch({ type: ACTIONS.RESET }); window.location.href = '/'; }, []);

  return (
    <AppContext.Provider value={{
      user: state.user, login, logout, updateUser, isAuthenticated,
      posts: state.posts, setPosts, addPost, updatePost, removePost,
      drafts: state.drafts, setDrafts, addDraft, removeDraft,
      pinnedPosts: state.pinnedPosts, pinPost, unpinPost,
      notifications: state.notifications, notify, notifySuccess, notifyError, notifyInfo, removeNotification, clearNotifications, unreadNotificationsCount,
      theme: state.theme, toggleTheme,
      loading: state.loading, setLoading,
      settings: state.settings, updateSettings,
      offline: state.offline,
      fetchWithLoading, fetchPostsAPI, createPostAPI,
      searchQuery: state.searchQuery, setSearchQuery,
      undo, redo, canUndo, canRedo, pushHistory,
      resetApp,
      state
    }}>
      {children}
    </AppContext.Provider>
  );
}

// ===== Hook =====
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
